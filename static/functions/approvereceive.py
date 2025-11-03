from static.functions.db_connections_functions import execute_query  # Import the connection pool function

from datetime import datetime

def approve_receive_request_function(data):
    try:
        print('Received data:', data)

        completiondate = data[0]['completiondate']
        transaction_uid = data[0]['Transaction_uid']

        print("Transaction UID:", transaction_uid)
        print("Completion date:", completiondate)

        # Step 1: Check if already approved by receiver manager
        status_check_query = "SELECT ApprovalToReceive FROM transaction_details WHERE Transaction_uid = %s"
        status_result = execute_query(status_check_query, (transaction_uid,))
        if not status_result:
            return "Invalid transaction ID."

        approval_status = status_result[0]['ApprovalToReceive']
        if approval_status == 1:
            return "This form has already been approved by the receiver manager."

        # Step 2: Check if transaction has valid CompletionDate
        query = "SELECT CompletionDate FROM transaction_details WHERE Transaction_uid = %s"
        result = execute_query(query, (transaction_uid,))
        
        print(f"[DEBUG] CompletionDate check for transaction {transaction_uid}: {result}")
        
        if result and result[0]['CompletionDate'] not in [None, '', '0']:
            # Approved case
            update_query = """
                UPDATE transaction_details
                SET ApprovalToReceive = 1, Status = 1
                WHERE Transaction_uid = %s
            """
            execute_query(update_query, (transaction_uid,), commit=True)

            # Reset is_initiate for all products
            products_query = """
                SELECT ProductID 
                FROM transaction_product_details 
                WHERE Transaction_uid = %s
            """
            products = execute_query(products_query, (transaction_uid,))
            for product in products:
                product_id = product['ProductID']
                reset_query = "UPDATE inventory SET is_initiate = 0 WHERE ProductID = %s"
                execute_query(reset_query, (product_id,), commit=True)
                print(f"Reset is_initiate for ProductID: {product_id}")
        else:
            # Invalid CompletionDate
            update_query = """
                UPDATE transaction_details
                SET ApprovalToReceive = 0, Status = 2
                WHERE Transaction_uid = %s
            """
            execute_query(update_query, (transaction_uid,), commit=True)
            return "Transaction does not have valid completion data. Marked as disapproved."

                # Step 3: Resolve Receiver's ID from user_info or managers_data
        receiver_uid = data[0].get('Receiverid')
        owner_id = None
        print(f"[DEBUG] Initial receiver_uid from frontend data: {receiver_uid}")

        # Fallback: fetch Receiver_uid from DB if frontend sent blank
        if not receiver_uid:
            print("[DEBUG] receiver_uid is empty from frontend, attempting DB fallback.")
            fallback_row = execute_query(
                "SELECT Receiver_uid FROM transaction_details WHERE Transaction_uid = %s",
                (transaction_uid,)
            )
            if fallback_row and fallback_row[0].get('Receiver_uid') is not None:
                receiver_uid = fallback_row[0]['Receiver_uid']
                print(f"[DEBUG] Fallback Receiver_uid from DB: {receiver_uid}")
            else:
                print(f"[ERROR] Could not find Receiver_uid in DB for transaction {transaction_uid}")

        if receiver_uid:
            # Try user_info
            user_lookup = execute_query(
                "SELECT ID FROM user_info WHERE userinfo_uid = %s", (receiver_uid,)
            )
            print(f"[DEBUG] user_info lookup result for userinfo_uid {receiver_uid}: {user_lookup}")
            if user_lookup:
                owner_id = user_lookup[0]['ID']
                print(f"[DEBUG] Resolved owner_id from user_info: {owner_id}")
            else:
                # Try managers_data
                manager_lookup = execute_query(
                    "SELECT ID FROM managers_data WHERE manager_index_id = %s", (receiver_uid,)
                )
                print(f"[DEBUG] managers_data lookup result for manager_index_id {receiver_uid}: {manager_lookup}")
                if manager_lookup:
                    owner_id = manager_lookup[0]['ID']
                    print(f"[DEBUG] Resolved owner_id from managers_data: {owner_id}")

        if not owner_id:
            print(f"[ERROR] Could not resolve owner_id from Receiverid={receiver_uid}")
            return "Failed to resolve Owner from Receiver ID."

        # Ensure default_owner_id is the resolved ID (e.g., 'P00125')
        default_owner_id = owner_id
        # Step 4: Update inventory for each product
        for index, item in enumerate(data[1:]): # Start from index 1 to skip metadata
            print(f"[DEBUG] Processing item {index + 1}: {item}")
            
            product_id = item.get('ProductID')
            if product_id is None:
                print(f"[WARNING] Missing ProductID in item {index + 1}")
                continue

            product_id = int(product_id)
            project = item.get('Project')
            
            # Get the owner ID from frontend and resolve it to proper ID format
            # The 'Owner' field from the frontend is the userinfo_uid or manager_index_id
            owner_uid_from_frontend = item.get('Owner')
            print(f"[DEBUG] owner_uid from frontend: {owner_uid_from_frontend}")

            # Default to resolved receiver ID (safe fallback)
            item_owner_id = default_owner_id

            # If an owner_uid was explicitly sent from the frontend for this item,
            # try to resolve it to the corresponding 'ID' from user_info or managers_data
            if owner_uid_from_frontend:
                # Try user_info table first
                user_lookup = execute_query(
                    "SELECT ID FROM user_info WHERE userinfo_uid = %s", (owner_uid_from_frontend,)
                )
                print(f"[DEBUG] user_lookup result: {user_lookup}")
                
                if user_lookup:
                    item_owner_id = user_lookup[0]['ID']
                    print(f"[DEBUG] Resolved owner_id from user_info: {item_owner_id} for uid: {owner_uid_from_frontend}")
                else:
                    # Try managers_data table
                    manager_lookup = execute_query(
                        "SELECT ID FROM managers_data WHERE manager_index_id = %s", (owner_uid_from_frontend,)
                    )
                    print(f"[DEBUG] manager_lookup result: {manager_lookup}")
                    
                    if manager_lookup:
                        item_owner_id = manager_lookup[0]['ID']
                        print(f"[DEBUG] Resolved owner_id from managers_data: {item_owner_id} for uid: {owner_uid_from_frontend}")

            print(f"[DEBUG] Final owner_id used for update: {item_owner_id}")

            if not item_owner_id:
                print(f"[ERROR] Could not resolve owner for ProductID={product_id}")
                continue

            # Get project_id
            project_query = "SELECT project_id FROM projects_managers WHERE Projects = %s"
            project_result = execute_query(project_query, (project,))
            if not project_result:
                print(f"[WARNING] No project_id found for project name: {project}")
                continue

            project_id = project_result[0]['project_id']
            print(f"[DEBUG] project_id: {project_id}")

            # Determine condition
            reached = item.get('Reached')
            condition = item.get('ReceiverCondition') if reached == 'Accepted' else item.get('SenderCondition')
            if condition is None:
                print(f"[WARNING] No condition provided for ProductID: {product_id}")
                continue

            condition_map = {'Good': 0, 'Not OK': 1, 'Damaged': 2, 0: 0, 1: 1, 2: 2}
            condition = condition_map.get(condition, condition)
            print(f"[DEBUG] condition: {condition}")

            # Final inventory update
            update_inventory_query = """
                UPDATE inventory
                SET `Condition` = %s, Owner = %s, project_id = %s, Handover_Date = %s
                WHERE ProductID = %s
            """
            print(f"[DEBUG] Executing update query with values: condition={condition}, owner_id={item_owner_id}, project_id={project_id}, completiondate={completiondate}, product_id={product_id}")
            
            execute_query(update_inventory_query, (
                condition, item_owner_id, project_id, completiondate, product_id
            ), commit=True)

            print(f"[DEBUG] Inventory updated: ProductID {product_id} → Owner {item_owner_id}, Project {project_id}, Condition {condition}")



        return "Receiver manager approval processed successfully."

    except Exception as e:
        print(f"[ERROR] Exception in approve_receive_request_function: {e}")
        return f"Error: {str(e)}"
    



    

def disapprove_receive_request_function(form_data):
    try:
        transaction_uid = form_data['Transaction_uid']
        remarks = form_data['remarks']

        print(f"Disapproving Transaction_uid: {transaction_uid}")

        # Step 1: Check current ApprovalToReceive status
        status_check_query = """
            SELECT ApprovalToReceive 
            FROM transaction_details 
            WHERE Transaction_uid = %s
        """
        status_result = execute_query(status_check_query, (transaction_uid,))

        if not status_result:
            return "Invalid transaction ID."

        approval_status = status_result[0]['ApprovalToReceive']

        if approval_status == 1:
            return "This form has already been approved by the receiver manager."
        elif approval_status == 2:
            return "This form has already been disapproved by the receiver manager."

        # Step 2: Fetch ProductIDs associated with the transaction
        select_query = """
            SELECT ProductID 
            FROM transaction_product_details 
            WHERE Transaction_uid = %s
        """
        products = execute_query(select_query, (transaction_uid,))

        # Step 3: Reset is_initiate for each product in inventory
        update_inventory_query = """
            UPDATE inventory 
            SET is_initiate = 0 
            WHERE ProductID = %s
        """

        for product in products:
            execute_query(update_inventory_query, (product['ProductID'],), commit=True)

        # Step 4: Mark transaction as disapproved
        update_query = """
            UPDATE transaction_details
            SET Status = 2, ApprovalToReceive = 2, DisapproveRemarks = %s
            WHERE Transaction_uid = %s
        """
        execute_query(update_query, (remarks, transaction_uid), commit=True)

        return "Receiver manager disapproval has been successfully recorded."

    except Exception as e:
        print(f"Unexpected error in disapprove_receive_request_function: {e}")
        return f"Error: {str(e)}"
