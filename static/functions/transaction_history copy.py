from flask import jsonify
from static.functions.db_connections_functions import execute_query
import pandas as pd
import numpy as np

def transaction_history_table_function(name, projects, toa, session_data):
    try:
        print(f"Transaction history for: Name={name}, ToA={toa}, Projects={projects}")
        user_id = session_data.get('ID', '')
        print(f"User session data: {session_data}")
        
        # Step 1: Lookup user or manager ID
        user_uid = None
        is_manager = False
        
        # First, check managers_data table
        manager_lookup_query = """
            SELECT manager_index_id, Name FROM managers_data 
            WHERE ID = %s OR Name = %s
        """
        print(f"Looking up manager_index_id with ID={user_id} or Name={name}")
        manager_result = execute_query(manager_lookup_query, (user_id, name))
        
        if manager_result:
            user_uid = manager_result[0].get('manager_index_id')
            is_manager = True
            print(f"Found manager_index_id: {user_uid} for name: {name}")
        else:
            # Fallback to user_info table
            user_lookup_query = """
                SELECT userinfo_uid, ID, Name FROM user_info 
                WHERE ID = %s OR Name = %s
            """
            print(f"Looking up userinfo_uid with ID={user_id} or Name={name}")
            user_result = execute_query(user_lookup_query, (user_id, name))
            
            if user_result:
                user_uid = user_result[0].get('userinfo_uid')
                print(f"Found userinfo_uid: {user_uid} for name: {name}")
            else:
                print(f"Warning: Could not find ID for ID={user_id} or Name={name} in managers_data or user_info")
                # Last resort: Check transaction_details directly
                check_query = """
                    SELECT DISTINCT Sender_uid FROM transaction_details 
                    WHERE Sender_uid = %s OR Sender_uid = %s
                    UNION
                    SELECT DISTINCT Receiver_uid FROM transaction_details 
                    WHERE Receiver_uid = %s OR Receiver_uid = %s
                    LIMIT 1
                """
                check_result = execute_query(check_query, (name, user_id, name, user_id))
                if check_result:
                    user_uid = check_result[0].get('Sender_uid')
                    print(f"Found UID in transaction_details: {user_uid}")
        
        if not user_uid:
            print("No valid user/manager ID found")
            return jsonify({"filtered_data": [], "session_data": session_data, "error": "User or manager not found"})

        # Step 2: Construct transaction queries
        send_query = ""
        receive_query = ""
        query_params_send = []
        query_params_receive = []

        # Join condition to handle both manager and user UIDs
        sender_join = """
            LEFT JOIN user_info su ON td.Sender_uid = su.userinfo_uid
            LEFT JOIN managers_data sm ON td.Sender_uid = sm.manager_index_id
        """
        receiver_join = """
            LEFT JOIN user_info ru ON td.Receiver_uid = ru.userinfo_uid
            LEFT JOIN managers_data rm ON td.Receiver_uid = rm.manager_index_id
        """
        name_coalesce = """
            COALESCE(su.Name, sm.Name) AS SenderName,
            COALESCE(ru.Name, rm.Name) AS ReceiverName
        """

        if toa == "Employee":
            print(f"Employee query with UID={user_uid}")
            send_query = f"""
                SELECT td.*, tpd.*, inv.*, {name_coalesce}
                FROM transaction_details td
                LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                {sender_join}
                {receiver_join}
                WHERE td.Sender_uid = %s AND td.Status != 0
            """
            receive_query = f"""
                SELECT td.*, tpd.*, inv.*, {name_coalesce}
                FROM transaction_details td
                LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                {sender_join}
                {receiver_join}
                WHERE td.Receiver_uid = %s AND td.Status != 0
            """
            query_params_send = [user_uid]
            query_params_receive = [user_uid]

        elif toa == "Manager":
            # Ensure projects is a list
            projects = projects if isinstance(projects, list) else [projects] if projects else []
            
            if projects:
                project_placeholders = ','.join(['%s'] * len(projects))
                send_query = f"""
                    SELECT td.*, tpd.*, inv.*, {name_coalesce}
                    FROM transaction_details td
                    LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                    LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                    {sender_join}
                    {receiver_join}
                    WHERE (td.Source IN ({project_placeholders}) OR td.Sender_uid = %s) 
                    AND td.Status != 0
                """
                receive_query = f"""
                    SELECT td.*, tpd.*, inv.*, {name_coalesce}
                    FROM transaction_details td
                    LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                    LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                    {sender_join}
                    {receiver_join}
                    WHERE (td.Destination IN ({project_placeholders}) OR td.Receiver_uid = %s) 
                    AND td.Status != 0
                """
                query_params_send = projects + [user_uid]
                query_params_receive = projects + [user_uid]
            else:
                # Manager with no projects: only their transactions
                send_query = f"""
                    SELECT td.*, tpd.*, inv.*, {name_coalesce}
                    FROM transaction_details td
                    LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                    LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                    {sender_join}
                    {receiver_join}
                    WHERE td.Sender_uid = %s AND td.Status != 0
                """
                receive_query = f"""
                    SELECT td.*, tpd.*, inv.*, {name_coalesce}
                    FROM transaction_details td
                    LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                    LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                    {sender_join}
                    {receiver_join}
                    WHERE td.Receiver_uid = %s AND td.Status != 0
                """
                query_params_send = [user_uid]
                query_params_receive = [user_uid]
        else:
            # Admin or other account types: see all transactions
            send_query = f"""
                SELECT td.*, tpd.*, inv.*, {name_coalesce}
                FROM transaction_details td
                LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                {sender_join}
                {receiver_join}
                WHERE td.Status != 0
            """
            receive_query = send_query
            query_params_send = []
            query_params_receive = []

        print(f"Executing send_query: {send_query}")
        print(f"With parameters: {query_params_send}")
        Send_data = execute_query(send_query, query_params_send)
        print(f"Send data results: {len(Send_data) if Send_data else 0} records")
        
        print(f"Executing receive_query: {receive_query}")
        print(f"With parameters: {query_params_receive}")
        Receive_data = execute_query(receive_query, query_params_receive)
        print(f"Receive data results: {len(Receive_data) if Receive_data else 0} records")

        # Rest of the code remains the same (DataFrame processing, project name lookup, etc.)
        if Send_data is None:
            Send_data = []
        if Receive_data is None:
            Receive_data = []

        if len(Send_data) > 0:
            Send_df = pd.DataFrame(Send_data)
            Send_df["TransactionType"] = "Send"
        else:
            Send_df = pd.DataFrame()
            
        if len(Receive_data) > 0:
            Receive_df = pd.DataFrame(Receive_data)
            Receive_df["TransactionType"] = "Receive"
        else:
            Receive_df = pd.DataFrame()

        combined_df = pd.concat([Send_df, Receive_df], ignore_index=True)
        
        if combined_df.empty:
            print("No transaction data found")
            return jsonify({"filtered_data": [], "session_data": session_data})

        unique_column = 'Transaction_uid'
        if unique_column in combined_df.columns:
            combined_df = combined_df.drop_duplicates(subset=[unique_column])
        elif 'FormID' in combined_df.columns:
            combined_df = combined_df.drop_duplicates(subset=['FormID'])
        else:
            print("Warning: Unique identifier column not found in data")

        date_column = 'InitiationDate'
        if date_column in combined_df.columns:
            combined_df = combined_df.sort_values(by=date_column, ascending=False)
        else:
            for alt_date in ['Date', 'TransactionDate', 'CreationDate']:
                if alt_date in combined_df.columns:
                    combined_df = combined_df.sort_values(by=alt_date, ascending=False)
                    print(f"Sorted by alternative date column: {alt_date}")
                    break

        data_dict = combined_df.replace({np.nan: None}).to_dict(orient='records')

        print("Status values in data_dict:", [record.get("Status") for record in data_dict])

        filtered_data = [
            record for record in data_dict
            if str(record.get("Status")) in ("1", "2")
        ]

        project_ids = set()
        for record in filtered_data:
            if 'Source' in record:
                project_ids.add(record['Source'])
            if 'Destination' in record:
                project_ids.add(record['Destination'])
        if project_ids:
            placeholders = ','.join(['%s'] * len(project_ids))
            project_name_query = f"SELECT project_id, Projects FROM projects_managers WHERE project_id IN ({placeholders})"
            project_names = execute_query(project_name_query, tuple(project_ids))
            project_id_to_name = {str(row['project_id']): row['Projects'] for row in project_names}
            for record in filtered_data:
                record['SourceName'] = project_id_to_name.get(str(record.get('Source')), record.get('Source'))
                record['DestinationName'] = project_id_to_name.get(str(record.get('Destination')), record.get('Destination'))

        final_data = {"filtered_data": filtered_data, "session_data": session_data}
        json_data = jsonify(final_data)
        print("Data processed and converted to JSON successfully")
        return json_data

    except Exception as e:
        print(f"Error in transaction_history_table_function: {str(e)}")
        return jsonify({"filtered_data": [], "session_data": session_data, "error": str(e)})