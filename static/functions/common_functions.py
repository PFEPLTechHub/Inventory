from flask import jsonify
from static.functions.db_connections_functions import execute_query
import pandas as pd

def extract_transaction_data(transaction_uid):
    try:
        # Fetch transaction details, including Sender and Receiver Name from user_info
        transaction_details_query = """
        SELECT
            td.Transaction_uid,
           COALESCE(su.Name, sm.Name) AS SenderName,

            COALESCE(ru.Name, rm.Name) AS ReceiverName,
            td.EwayBillNo,
            td.Source,
            td.Destination,
            td.InitiationDate,
            td.CompletionDate,
            td.ApprovalToSend,
            td.ApprovalToReceive,
            td.IsReceive,
            td.Status,
            td.ewayreason,
            td.DisapproveRemarks,
            td.Receiver_uid
        FROM transaction_details td
        LEFT JOIN user_info su ON td.Sender_uid = su.userinfo_uid
        LEFT JOIN managers_data sm ON td.Sender_uid = sm.manager_index_id
        LEFT JOIN user_info ru ON td.Receiver_uid = ru.userinfo_uid
        LEFT JOIN managers_data rm ON td.Receiver_uid = rm.manager_index_id
        WHERE td.Transaction_uid = %s
        """
        transaction_details = execute_query(transaction_details_query, (transaction_uid,))

        # Debug: Log transaction details and approval flags
        print(f"Transaction details for {transaction_uid}: {transaction_details}")
        
        if transaction_details:
            ats = transaction_details[0].get('ApprovalToSend')
            atr = transaction_details[0].get('ApprovalToReceive')
            print(f"ApprovalToSend: {ats} (Type: {type(ats)})")
            print(f"ApprovalToReceive: {atr} (Type: {type(atr)})")
            
            # Ensure ApprovalToSend and ApprovalToReceive are integers
            if ats == '-':
                transaction_details[0]['ApprovalToSend'] = 0
            elif isinstance(ats, str):
                transaction_details[0]['ApprovalToSend'] = int(ats) if ats.isdigit() else 0
                
            if atr == '-':
                transaction_details[0]['ApprovalToReceive'] = 0
            elif isinstance(atr, str):
                transaction_details[0]['ApprovalToReceive'] = int(atr) if atr.isdigit() else 0
                
            print(f"After conversion - ApprovalToSend: {transaction_details[0]['ApprovalToSend']}, ApprovalToReceive: {transaction_details[0]['ApprovalToReceive']}")

            # Fetch project names for Source and Destination
            source_id = transaction_details[0]['Source']
            destination_id = transaction_details[0]['Destination']
            # Query project names
            project_name_query = "SELECT project_id, Projects FROM projects_managers WHERE project_id IN (%s, %s)"
            project_names = execute_query(project_name_query, (source_id, destination_id))
            project_id_to_name = {str(row['project_id']): row['Projects'] for row in project_names}
            # Add project names to transaction_details[0]
            transaction_details[0]['SourceName'] = project_id_to_name.get(str(source_id), source_id)
            transaction_details[0]['DestinationName'] = project_id_to_name.get(str(destination_id), destination_id)

            




        # Fetch product details - Only show pending items using item_status
        product_details_query = """
        SELECT * FROM transaction_product_details
        WHERE Transaction_uid = %s
          AND item_status IS NULL
        """
        transaction_product_details = execute_query(product_details_query, (transaction_uid,))

        # Fetch projects_managers with manager names using JOIN
        if transaction_details and 'Source' in transaction_details[0]:
            project_query = """
            SELECT pm.Projects, pm.project_id, pm.Manager, md.Name as ManagerName 
            FROM projects_managers pm
            LEFT JOIN managers_data md ON pm.Manager = md.manager_index_id
            WHERE pm.project_id IN (%s, %s)
            """
            source = transaction_details[0]['Source']
            destination = transaction_details[0]['Destination']
            print(f"Debug - Source: {source}, Destination: {destination}")
            project_managers = execute_query(project_query, (source, destination))
            print(f"Debug - Project Managers Query Result: {project_managers}")
            if isinstance(project_managers, list):
                project_managers = [dict(item) for item in project_managers]  # Convert to list of dicts if not already
            # Ensure correct order: sender first, receiver second
            sender_manager = next((pm for pm in project_managers if str(pm['project_id']) == str(source)), None)
            receiver_manager = next((pm for pm in project_managers if str(pm['project_id']) == str(destination)), None)
            print(f"Debug - Sender Manager: {sender_manager}")
            print(f"Debug - Receiver Manager: {receiver_manager}")

            # NOTE: For correct manager names, ensure projects_managers.Manager matches managers_data.manager_index_id
            def get_manager_name(manager):
                if manager and manager.get('ManagerName'):
                    return manager['ManagerName']
                return "Manager not available"

            project_managers_ordered = [
                {"Manager": get_manager_name(sender_manager), "Projects": source},
                {"Manager": get_manager_name(receiver_manager), "Projects": destination}
            ]
            print(f"Debug - Final Project Managers Ordered: {project_managers_ordered}")
        else:
            project_managers_ordered = [
                {"Manager": "Manager not available"},
                {"Manager": "Manager not available"}
            ]

        # Fetch inventory details (separate inventory table)
        inventory_details = {}
            
        for product in transaction_product_details:
            print('we are here !!!!!!!!')
            product_id = product.get("ProductID")
            print('this is Product_ID:', product_id)  # Check if ProductID exists and is being retrieved
    
            if product_id:  # Ensure ProductID is valid
                inventory_query = """
                SELECT * FROM inventory WHERE ProductID = %s
                """
                
                # Assuming execute_query returns a DataFrame, let's fetch the data
                inventory_data = execute_query(inventory_query, (product_id,))
                print('inventory data', inventory_data)

                
                if inventory_data:
                    # Ensure inventory_data is a list of records (even if it contains one record)
                    if isinstance(inventory_data, list):
                        print("We are here 1")
                        # Convert the inventory list to the expected dictionary format
                        inventory_data = [dict(item) for item in inventory_data]  # Ensure every item is a dict if not already
                        print("We are here 2")
                        print("inventory data", inventory_data)
                        inventory_details[product_id] = inventory_data[0]  # Store first result (assuming one match per product)
                        print(f"Inventory data for ProductID {product_id}: {inventory_data[0]}")
                    else:
                        print(f"No inventory data found for ProductID {product_id}")
                else:
                    print(f"No inventory data returned for ProductID {product_id}")
            print("Final inventory_details:", inventory_details)         

        # Return message if no data found
        if not transaction_details and not transaction_product_details:
            return {"message": "No data found for the provided Transaction UID"}

        # Convert to list of dicts only if it's a DataFrame
        if isinstance(transaction_details, pd.DataFrame):
            transaction_details = (
                transaction_details.fillna("")  # replace NaN with empty string
                .astype(str)                   # convert all values to strings
                .to_dict(orient='records')     # convert to list of dicts
            )

        if isinstance(transaction_product_details, pd.DataFrame):
            transaction_product_details = (
                transaction_product_details.fillna("")
                .astype(str)
                .to_dict(orient='records')
            )

        # Now, for each product, we can look up the corresponding inventory details using ProductID
        for product in transaction_product_details:
            product_id = product.get("ProductID")
            if product_id in inventory_details:
                # Merge the inventory details into the product data
                product.update(inventory_details[product_id])    

        # Return safe dictionary
        return {
            "transaction_details": transaction_details or [],
            "transaction_product_details": transaction_product_details or [],
            "inventory_details": inventory_details,  # Add inventory details separately
            "project_managers": project_managers_ordered  # Now includes manager names in correct order
        }

    except Exception as e:
        print(f"Error in extract_transaction_data: {str(e)}")
        return {"error": f"Error extracting data: {str(e)}"}

def extract_transaction_data_for_sender_approval(transaction_uid):
    """
    Extract transaction data specifically for sender manager approval.
    This function shows ALL items in the transaction, not just pending ones.
    """
    try:
        # Fetch transaction details, including Sender and Receiver Name from user_info
        transaction_details_query = """
        SELECT
            td.Transaction_uid,
           COALESCE(su.Name, sm.Name) AS SenderName,

            COALESCE(ru.Name, rm.Name) AS ReceiverName,
            td.EwayBillNo,
            td.Source,
            td.Destination,
            td.InitiationDate,
            td.CompletionDate,
            td.ApprovalToSend,
            td.ApprovalToReceive,
            td.IsReceive,
            td.Status,
            td.ewayreason,
            td.DisapproveRemarks,
            td.Receiver_uid
        FROM transaction_details td
        LEFT JOIN user_info su ON td.Sender_uid = su.userinfo_uid
        LEFT JOIN managers_data sm ON td.Sender_uid = sm.manager_index_id
        LEFT JOIN user_info ru ON td.Receiver_uid = ru.userinfo_uid
        LEFT JOIN managers_data rm ON td.Receiver_uid = rm.manager_index_id
        WHERE td.Transaction_uid = %s
        """
        transaction_details = execute_query(transaction_details_query, (transaction_uid,))

        # Debug: Log transaction details and approval flags
        print(f"Transaction details for {transaction_uid}: {transaction_details}")
        
        if transaction_details:
            ats = transaction_details[0].get('ApprovalToSend')
            atr = transaction_details[0].get('ApprovalToReceive')
            print(f"ApprovalToSend: {ats} (Type: {type(ats)})")
            print(f"ApprovalToReceive: {atr} (Type: {type(atr)})")
            
            # Ensure ApprovalToSend and ApprovalToReceive are integers
            if ats == '-':
                transaction_details[0]['ApprovalToSend'] = 0
            elif isinstance(ats, str):
                transaction_details[0]['ApprovalToSend'] = int(ats) if ats.isdigit() else 0
                
            if atr == '-':
                transaction_details[0]['ApprovalToReceive'] = 0
            elif isinstance(atr, str):
                transaction_details[0]['ApprovalToReceive'] = int(atr) if atr.isdigit() else 0
                
            print(f"After conversion - ApprovalToSend: {transaction_details[0]['ApprovalToSend']}, ApprovalToReceive: {transaction_details[0]['ApprovalToReceive']}")

            # Fetch project names for Source and Destination
            source_id = transaction_details[0]['Source']
            destination_id = transaction_details[0]['Destination']
            # Query project names
            project_name_query = "SELECT project_id, Projects FROM projects_managers WHERE project_id IN (%s, %s)"
            project_names = execute_query(project_name_query, (source_id, destination_id))
            project_id_to_name = {str(row['project_id']): row['Projects'] for row in project_names}
            # Add project names to transaction_details[0]
            transaction_details[0]['SourceName'] = project_id_to_name.get(str(source_id), source_id)
            transaction_details[0]['DestinationName'] = project_id_to_name.get(str(destination_id), destination_id)

        # Fetch product details - Show ALL items for sender manager approval (no ItemStatus filter)
        product_details_query = """
        SELECT * FROM transaction_product_details
        WHERE Transaction_uid = %s
        """
        transaction_product_details = execute_query(product_details_query, (transaction_uid,))

        # Fetch projects_managers with manager names using JOIN
        if transaction_details and 'Source' in transaction_details[0]:
            project_query = """
            SELECT pm.Projects, pm.project_id, pm.Manager, md.Name as ManagerName 
            FROM projects_managers pm
            LEFT JOIN managers_data md ON pm.Manager = md.manager_index_id
            WHERE pm.project_id IN (%s, %s)
            """
            source = transaction_details[0]['Source']
            destination = transaction_details[0]['Destination']
            print(f"Debug - Source: {source}, Destination: {destination}")
            project_managers = execute_query(project_query, (source, destination))
            print(f"Debug - Project Managers Query Result: {project_managers}")
            if isinstance(project_managers, list):
                project_managers = [dict(item) for item in project_managers]  # Convert to list of dicts if not already
            # Ensure correct order: sender first, receiver second
            sender_manager = next((pm for pm in project_managers if str(pm['project_id']) == str(source)), None)
            receiver_manager = next((pm for pm in project_managers if str(pm['project_id']) == str(destination)), None)
            print(f"Debug - Sender Manager: {sender_manager}")
            print(f"Debug - Receiver Manager: {receiver_manager}")

            # NOTE: For correct manager names, ensure projects_managers.Manager matches managers_data.manager_index_id
            def get_manager_name(manager):
                if manager and manager.get('ManagerName'):
                    return manager['ManagerName']
                return "Manager not available"

            project_managers_ordered = [
                {"Manager": get_manager_name(sender_manager), "Projects": source},
                {"Manager": get_manager_name(receiver_manager), "Projects": destination}
            ]
            print(f"Debug - Final Project Managers Ordered: {project_managers_ordered}")
        else:
            project_managers_ordered = [
                {"Manager": "Manager not available"},
                {"Manager": "Manager not available"}
            ]

        # Fetch inventory details (separate inventory table)
        inventory_details = {}
            
        for product in transaction_product_details:
            print('we are here !!!!!!!!')
            product_id = product.get("ProductID")
            print('this is Product_ID:', product_id)  # Check if ProductID exists and is being retrieved
    
            if product_id:  # Ensure ProductID is valid
                inventory_query = """
                SELECT * FROM inventory WHERE ProductID = %s
                """
                
                # Assuming execute_query returns a DataFrame, let's fetch the data
                inventory_data = execute_query(inventory_query, (product_id,))
                print('inventory data', inventory_data)

                
                if inventory_data:
                    # Ensure inventory_data is a list of records (even if it contains one record)
                    if isinstance(inventory_data, list):
                        print("We are here 1")
                        # Convert the inventory list to the expected dictionary format
                        inventory_data = [dict(item) for item in inventory_data]  # Ensure every item is a dict if not already
                        print("We are here 2")
                        print("inventory data", inventory_data)
                        inventory_details[product_id] = inventory_data[0]  # Store first result (assuming one match per product)
                        print(f"Inventory data for ProductID {product_id}: {inventory_data[0]}")
                    else:
                        print(f"No inventory data found for ProductID {product_id}")
                else:
                    print(f"No inventory data returned for ProductID {product_id}")
            print("Final inventory_details:", inventory_details)         

        # Return message if no data found
        if not transaction_details and not transaction_product_details:
            return {"message": "No data found for the provided Transaction UID"}

        # Convert to list of dicts only if it's a DataFrame
        if isinstance(transaction_details, pd.DataFrame):
            transaction_details = (
                transaction_details.fillna("")  # replace NaN with empty string
                .astype(str)                   # convert all values to strings
                .to_dict(orient='records')     # convert to list of dicts
            )

        if isinstance(transaction_product_details, pd.DataFrame):
            transaction_product_details = (
                transaction_product_details.fillna("")
                .astype(str)
                .to_dict(orient='records')
            )

        # Now, for each product, we can look up the corresponding inventory details using ProductID
        for product in transaction_product_details:
            product_id = product.get("ProductID")
            if product_id in inventory_details:
                # Merge the inventory details into the product data
                product.update(inventory_details[product_id])    

        # Return safe dictionary
        return {
            "transaction_details": transaction_details or [],
            "transaction_product_details": transaction_product_details or [],
            "inventory_details": inventory_details,  # Add inventory details separately
            "project_managers": project_managers_ordered  # Now includes manager names in correct order
        }

    except Exception as e:
        print(f"Error in extract_transaction_data_for_sender_approval: {str(e)}")
        return {"error": f"Error extracting data: {str(e)}"}
