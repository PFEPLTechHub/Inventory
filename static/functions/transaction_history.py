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
        
        manager_lookup_query = """
            SELECT manager_index_id, Name FROM managers_data 
            WHERE ID = %s OR Name = %s
        """
        manager_result = execute_query(manager_lookup_query, (user_id, name))
        
        if manager_result:
            user_uid = manager_result[0].get('manager_index_id')
            is_manager = True
            print(f"Found manager_index_id: {user_uid}")
        else:
            user_lookup_query = """
                SELECT userinfo_uid, ID, Name FROM user_info 
                WHERE ID = %s OR Name = %s
            """
            user_result = execute_query(user_lookup_query, (user_id, name))
            if user_result:
                user_uid = user_result[0].get('userinfo_uid')
                print(f"Found userinfo_uid: {user_uid}")
            else:
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
            return jsonify({"filtered_data": [], "session_data": session_data, "error": "User or manager not found"})

        # Step 2: Build main transaction query
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
            query = f"""
                SELECT td.*, tpd.*, inv.*, {name_coalesce}
                FROM transaction_details td
                LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                {sender_join}
                {receiver_join}
                WHERE (td.Sender_uid = %s OR td.Receiver_uid = %s) AND td.Status IN (1, 2)
            """
            params = [user_uid, user_uid]
        elif toa == "Manager":
            projects = projects if isinstance(projects, list) else [projects] if projects else []
            if projects:
                placeholders = ','.join(['%s'] * len(projects))
                query = f"""
                    SELECT td.*, tpd.*, inv.*, {name_coalesce}
                    FROM transaction_details td
                    LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                    LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                    {sender_join}
                    {receiver_join}
                    WHERE (td.Source IN ({placeholders}) OR td.Destination IN ({placeholders}) OR td.Sender_uid = %s OR td.Receiver_uid = %s)
                    AND td.Status IN (1, 2)
                """
                params = projects + projects + [user_uid, user_uid]
            else:
                query = f"""
                    SELECT td.*, tpd.*, inv.*, {name_coalesce}
                    FROM transaction_details td
                    LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                    LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                    {sender_join}
                    {receiver_join}
                    WHERE (td.Sender_uid = %s OR td.Receiver_uid = %s) AND td.Status IN (1, 2)
                """
                params = [user_uid, user_uid]
        else:
            query = f"""
                SELECT td.*, tpd.*, inv.*, {name_coalesce}
                FROM transaction_details td
                LEFT JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid
                LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
                {sender_join}
                {receiver_join}
                WHERE td.Status IN (1, 2)
            """
            params = []

        print(f"Executing transaction query: {query}")
        data = execute_query(query, params)
        if not data:
            data = []

        df = pd.DataFrame(data)
        if df.empty:
            return jsonify({"filtered_data": [], "session_data": session_data})

        # Step 3: Determine TransactionType dynamically
        def determine_transaction_type(row):
            if str(row.get("Status")) == "1":
                return "Receive"
            elif str(row.get("Status")) == "2":
                return "Send"
            return None

        df["TransactionType"] = df.apply(determine_transaction_type, axis=1)

        # Remove duplicates
        if 'Transaction_uid' in df.columns:
            df = df.drop_duplicates(subset=['Transaction_uid'])

        # Sort by InitiationDate
        if 'InitiationDate' in df.columns:
            df = df.sort_values(by='InitiationDate', ascending=False)

        # Map project names
        project_ids = set()
        for record in df.to_dict(orient='records'):
            if 'Source' in record:
                project_ids.add(record['Source'])
            if 'Destination' in record:
                project_ids.add(record['Destination'])
        if project_ids:
            placeholders = ','.join(['%s'] * len(project_ids))
            project_name_query = f"SELECT project_id, Projects FROM projects_managers WHERE project_id IN ({placeholders})"
            project_names = execute_query(project_name_query, tuple(project_ids))
            project_id_to_name = {str(row['project_id']): row['Projects'] for row in project_names}
            df["SourceName"] = df["Source"].astype(str).map(project_id_to_name).fillna(df["Source"])
            df["DestinationName"] = df["Destination"].astype(str).map(project_id_to_name).fillna(df["Destination"])

        # Prepare final JSON
        final_data = {"filtered_data": df.replace({np.nan: None}).to_dict(orient='records'), "session_data": session_data}
        return jsonify(final_data)

    except Exception as e:
        print(f"Error in transaction_history_table_function: {str(e)}")
        return jsonify({"filtered_data": [], "session_data": session_data, "error": str(e)})

def get_transaction_details_by_uid(transaction_uid):
    try:
        # Query to get transaction details
        transaction_details_query = """
            SELECT
                td.*,
                COALESCE(su.Name, sm.Name) AS SenderName,
                COALESCE(ru.Name, rm.Name) AS ReceiverName
            FROM transaction_details td
            LEFT JOIN user_info su ON td.Sender_uid = su.userinfo_uid
            LEFT JOIN managers_data sm ON td.Sender_uid = sm.manager_index_id
            LEFT JOIN user_info ru ON td.Receiver_uid = ru.userinfo_uid
            LEFT JOIN managers_data rm ON td.Receiver_uid = rm.manager_index_id
            WHERE td.Transaction_uid = %s
        """
        transaction_details = execute_query(transaction_details_query, (transaction_uid,))

        # Query to get transaction product details
        transaction_product_details_query = """
            SELECT
                tpd.*,
                inv.Category, inv.Name, inv.Make, inv.Model, inv.ProductSerial
            FROM transaction_product_details tpd
            LEFT JOIN inventory inv ON tpd.ProductID = inv.ProductID
            WHERE tpd.Transaction_uid = %s
        """
        transaction_product_details = execute_query(transaction_product_details_query, (transaction_uid,))

        # Query to get project managers for Source and Destination projects
        project_managers_query = """
            SELECT
                pm.project_id,
                pm.Projects,
                md.Name AS Manager
            FROM projects_managers pm
            LEFT JOIN managers_data md ON pm.Manager = md.manager_index_id
            WHERE pm.project_id IN (
                SELECT Source FROM transaction_details WHERE Transaction_uid = %s
                UNION
                SELECT Destination FROM transaction_details WHERE Transaction_uid = %s
            )
        """
        project_managers = execute_query(project_managers_query, (transaction_uid, transaction_uid))

        # Organize managers by project ID for easier access
        project_managers_map = {str(pm['project_id']): pm for pm in project_managers}

        # Replace Source and Destination IDs with names and add manager names
        if transaction_details:
            td = transaction_details[0]
            source_project_id = str(td.get('Source'))
            destination_project_id = str(td.get('Destination'))

            td['SourceName'] = project_managers_map.get(source_project_id, {}).get('Projects', td.get('Source'))
            td['DestinationName'] = project_managers_map.get(destination_project_id, {}).get('Projects', td.get('Destination'))

            sender_manager = project_managers_map.get(source_project_id, {}).get('Manager', '-')
            receiver_manager = project_managers_map.get(destination_project_id, {}).get('Manager', '-')
            
            # This part will be used to correctly map Sender Manager and Receiver Manager
            # For now, we'll return them in a separate list
            managers_for_frontend = [
                {'ProjectID': source_project_id, 'Manager': sender_manager},
                {'ProjectID': destination_project_id, 'Manager': receiver_manager}
            ]
        else:
            managers_for_frontend = []


        return {
            "transaction_details": transaction_details,
            "transaction_product_details": transaction_product_details,
            "project_managers": managers_for_frontend # Return managers data separately
        }
    except Exception as e:
        print(f"Error in get_transaction_details_by_uid: {str(e)}")
        return {
            "transaction_details": [],
            "transaction_product_details": [],
            "project_managers": [],
            "error": str(e)
        }
