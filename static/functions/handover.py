import logging
from flask import jsonify
from datetime import datetime
from static.functions.db_connections_functions import execute_query

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')


def is_item_already_initiated(sender_uid, product_ids):
    try:
        if not product_ids:
            return []  # Very important check to avoid wrong SQL

        format_strings = ','.join(['%s'] * len(product_ids))

        query = f"""
            SELECT tp.ProductID
            FROM transaction_product_details tp
            JOIN transaction_details td ON tp.Transaction_uid = td.Transaction_uid
            WHERE tp.ProductID IN ({format_strings})
              AND td.Sender_uid = %s
              AND td.Status = 0
              AND td.IsReceive = 0
        """

        params = product_ids + [sender_uid]
        result = execute_query(query, params)
        return [item['ProductID'] for item in result]

    except Exception as e:
        logging.error(f"Error in is_item_already_initiated: {e}")
        return []





def receive_destination_dropdown_values():
    try:
        # Step 1: Fetch user information with project details
        query_user_info = """
            SELECT 
                ui.Name, ui.userinfo_uid AS EmployeeID, pm.Projects AS Project, pm.project_id
            FROM user_info ui
            LEFT JOIN projects_managers pm ON ui.project_id = pm.project_id
            WHERE ui.TypeOfAccount != 'Admin'
              AND ui.Name IS NOT NULL
              AND ui.project_id IS NOT NULL
              AND ui.userinfo_uid IS NOT NULL
        """
        result_user_info = execute_query(query_user_info)

        # Build a dictionary of project to employee list
        project_emp_dict = {}
        for row in result_user_info:
            project = row['Project']
            emp_id = row['EmployeeID']
            name = row['Name']
            project_id = row['project_id']

            if project in project_emp_dict:
                project_emp_dict[project].append([emp_id, name, project_id])
            else:
                project_emp_dict[project] = [[emp_id, name, project_id]]

        # Step 2: Fetch manager info from managers_data using Physical_location as project_id
        query_managers_data = """
            SELECT 
                m.Physical_location AS project_id,
                m.Name AS ManagerName,
                m.manager_index_id
            FROM managers_data m
            WHERE m.Physical_location IS NOT NULL
              AND m.Name IS NOT NULL
        """
        result_managers_data = execute_query(query_managers_data)

        # Map project_id to list of managers
        manager_dict = {}
        for row in result_managers_data:
            project_id = row['project_id']
            manager_name = row['ManagerName']
            manager_index_id = row['manager_index_id']

            if project_id in manager_dict:
                manager_dict[project_id].append([manager_index_id, manager_name, project_id])
            else:
                manager_dict[project_id] = [[manager_index_id, manager_name, project_id]]

        # Step 3: Combine both employee and manager info by project name
        combined_project_info = {}
        for project, employees in project_emp_dict.items():
            project_id = employees[0][2]
            managers = manager_dict.get(project_id, [])

            combined_project_info[project] = {
                'employees': employees,
                'managers': managers  # returns a list, possibly empty
            }

        return combined_project_info

    except Exception as e:
        logging.error(f"Error in receive_destination_dropdown_values: {e}")
        return {}


def process_form_data(form_data):
    try:
        logging.info(f"Received form data: {form_data}")
        
        # Debug: Check table structure
        try:
            # Check current database
            db_query = "SELECT DATABASE() as current_db"
            db_result = execute_query(db_query)
            logging.info(f"Current database: {db_result}")
            
            # Check all tables that match our pattern
            tables_query = "SHOW TABLES LIKE '%transaction_product_details%'"
            tables_result = execute_query(tables_query)
            logging.info(f"Tables matching pattern: {tables_result}")
            
            table_check_query = "DESCRIBE transaction_product_details"
            table_structure = execute_query(table_check_query)
            logging.info(f"Table structure: {table_structure}")
            
            # Test if we can query the table
            test_query = "SELECT COUNT(*) as count FROM transaction_product_details"
            test_result = execute_query(test_query)
            logging.info(f"Current record count in transaction_product_details: {test_result}")
        except Exception as e:
            logging.error(f"Failed to check table structure: {e}")
        
        form_details = form_data[0]
        source = form_details.get('Source', '')
        destination = form_details.get('Destination', '')
        sender_id = form_details.get('Senderid', '')  # This is session user ID
        receiver_id = form_details.get('Receiverid', '')  # Sent from frontend
        receiver_type = form_details.get("ReceiverType", "user")  # user or manager
        ewayreason = form_details.get('ewayreason', '-') or '-'
        ewaybill = '-'
        item_details = form_data[1:]

        logging.info(f"Extracted - Source: {source}, Destination: {destination}, SenderID: {sender_id}, ReceiverID: {receiver_id}, ReceiverType: {receiver_type}")

        initiation_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # ----------------- Resolve Sender UID -----------------
        sender_uid = None
        # First try managers_data
        sender_query_mgr = "SELECT manager_index_id AS uid FROM managers_data WHERE ID = %s"
        sender_result_mgr = execute_query(sender_query_mgr, (sender_id,))
        if sender_result_mgr:
            sender_uid = sender_result_mgr[0]['uid']
            logging.info(f"Sender found in managers_data: {sender_uid}")
        else:
            # Then try user_info
            sender_query_user = "SELECT userinfo_uid AS uid FROM user_info WHERE ID = %s"
            sender_result_user = execute_query(sender_query_user, (sender_id,))
            if sender_result_user:
                sender_uid = sender_result_user[0]['uid']
                logging.info(f"Sender found in user_info: {sender_uid}")
            else:
                logging.error(f"No sender UID found for ID: {sender_id}")
                return {'error': f"No sender UID found for ID: {sender_id}"}

       
        
        # ----------------- Resolve Receiver UID -----------------
        if receiver_type == "user":
            receiver_query = "SELECT userinfo_uid AS uid FROM user_info WHERE userinfo_uid = %s"
        else:
            receiver_query = "SELECT manager_index_id AS uid FROM managers_data WHERE manager_index_id = %s"

        receiver_result = execute_query(receiver_query, (receiver_id,))
        if not receiver_result:
            logging.error(f"No receiver UID found for ID: {receiver_id} in {receiver_type}")
            return {'error': f"No receiver UID found for ID: {receiver_id}"}

        receiver_uid = receiver_result[0]['uid']
        logging.info(f"Receiver UID: {receiver_uid} (type: {receiver_type})")



        # ----------------- Create Transaction UID -----------------
        query_max_trans_uid = "SELECT MAX(CAST(Transaction_uid AS UNSIGNED)) AS max_uid FROM transaction_details"
        max_trans_result = execute_query(query_max_trans_uid)
        current_max_trans_uid = max_trans_result[0]['max_uid'] if max_trans_result[0]['max_uid'] is not None else 0
        next_trans_uid = current_max_trans_uid + 1
        formatted_transaction_uid = str(next_trans_uid).zfill(6)
        logging.info(f"New transaction UID: {formatted_transaction_uid}")

        # ----------------- Insert into transaction_details -----------------
        query_transaction = """
            INSERT INTO transaction_details (
                Transaction_uid, EwayBillNo, Source, Destination,
                Sender_uid, Receiver_uid, InitiationDate, CompletionDate,
                ApprovalToSend, ApprovalToReceive, IsReceive, Status,
                ewayreason, DisapproveRemarks
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, '-', 0, 0, 0, 0, %s, '-'
            )
        """
        
        transaction_params = (
            formatted_transaction_uid,
            ewaybill,
            source,
            destination,
            sender_uid,
            receiver_uid,
            initiation_date,
            ewayreason
        )
        
        logging.info(f"Attempting to insert into transaction_details with params: {transaction_params}")
        
        try:
            execute_query(query_transaction, transaction_params, commit=True)
            logging.info(f"Successfully inserted transaction {formatted_transaction_uid}")
        except Exception as e:
            logging.error(f"Failed to insert transaction {formatted_transaction_uid}: {e}")
            raise e

        # ----------------- Prepare for item insertions -----------------
        # Remove the manual ProductDetails_uid generation since it's now auto-increment
        condition_map = {'Good': 0, 'Not OK': 1, 'Damaged': 2, 0: 0, 1: 1, 2: 2}

        query_product = """
            INSERT INTO transaction_product_details (
                ProductID,
                SenderCondition, SenderRemark, SenderImage,
                ReceiverCondition, ReceiverRemark, ReceiverImage,
                Transaction_uid
            ) VALUES (
                %s, %s, %s, %s, NULL, NULL, NULL, %s
            )
        """
        
        logging.info(f"SQL Query for product insert: {query_product}")

        update_inventory_query = """
            UPDATE inventory 
            SET is_initiate = 1 
            WHERE ProductID = %s
        """

        image_mappings = {}

        for item in item_details:
            product_id = item.get('ProductID', '')
            sender_condition = item.get('SenderCondition', '')
            if sender_condition in condition_map:
                sender_condition = condition_map[sender_condition]
            sender_remark = item.get('SenderRemark', '-') or '-'
            sender_image = item.get('SenderImage', '') 
            image_valid = item.get('ImageValid', False)

            # Debug logging for insert
            insert_params = (product_id, sender_condition, sender_remark, sender_image, formatted_transaction_uid)
            logging.info(f"Attempting to insert into transaction_product_details with params: {insert_params}")
            
            try:
                execute_query(query_product, insert_params, commit=True)
                logging.info(f"Successfully inserted product {product_id} for transaction {formatted_transaction_uid}")
            except Exception as e:
                logging.error(f"Failed to insert product {product_id}: {e}")
                raise e

            try:
                execute_query(update_inventory_query, (product_id,), commit=True)
                logging.info(f"Successfully updated inventory for product {product_id}")
            except Exception as e:
                logging.error(f"Failed to update inventory for product {product_id}: {e}")
                raise e

            if product_id and sender_image:
                image_mappings[product_id] = {
                    'ext': sender_image,
                    'name': f"{product_id}.{sender_image}",
                    'valid': image_valid
                }

        logging.info(f"Transaction {formatted_transaction_uid} processed successfully with {len(item_details)} items")

        # Verify the insertions
        try:
            verify_query = "SELECT * FROM transaction_product_details WHERE Transaction_uid = %s"
            verify_result = execute_query(verify_query, (formatted_transaction_uid,))
            logging.info(f"Verification: Found {len(verify_result)} records in transaction_product_details for Transaction_uid {formatted_transaction_uid}")
            for record in verify_result:
                logging.info(f"Record: {record}")
            
            # Check the latest records in the table
            latest_query = "SELECT * FROM transaction_product_details ORDER BY ProductDetails_uid DESC LIMIT 5"
            latest_result = execute_query(latest_query)
            logging.info(f"Latest 5 records in transaction_product_details: {latest_result}")
        except Exception as e:
            logging.error(f"Failed to verify insertions: {e}")

        return {
            'transaction_uid': formatted_transaction_uid,
            'transaction_type': 'send',
            'image_mappings': image_mappings,
            'message': f'Data inserted successfully with Transaction ID: {formatted_transaction_uid}'
        }

    except Exception as e:
        logging.error(f"Error in process_form_data: {e}")
        return {'error': str(e)}




def cart_items_function(user_id, projects, session_data):
    try:
        logging.info(f"cart_items_function called with user_id={user_id!r}, projects={projects!r}")

        # Fetch inventory items owned by this user, with project name
        query = """
            SELECT 
                i.ProductID, i.Category, i.Name, i.Make, i.Model, i.Set, i.ProductSerial, 
                pm.Projects AS Project, i.Owner, i.is_initiate, i.project_id
            FROM inventory i
            LEFT JOIN projects_managers pm ON i.project_id = pm.project_id
            WHERE i.Owner = %s AND (i.is_initiate = 0 OR i.is_initiate IS NULL)
        """
        data = execute_query(query, (user_id,))
        logging.info(f"Query returned {len(data)} items")
        for item in data:
            logging.info(f"Item found - ProductID: {item['ProductID']}, is_initiate: {item.get('is_initiate')}")

        # Get dropdown with both employees and managers grouped by project name
        dropdownvalues = receive_destination_dropdown_values()

        # Detect if user is a manager for any project
        is_manager = False
        manager_index_id = None
        user_name = session_data.get("Name")

        for project_name, details in dropdownvalues.items():
            managers = details.get("managers", [])
            for mgr in managers:
                mgr_id, mgr_name, _ = mgr
                if mgr_name == user_name:
                    is_manager = True
                    manager_index_id = mgr_id
                    break
            if is_manager:
                break

        # Set user role and manager_index_id in session_data
        session_data["role"] = "manager" if is_manager else "employee"
        if is_manager:
            session_data["manager_index_id"] = manager_index_id

        # Get user’s sender projects (from inventory items)
        sender_projects = list({item['Project'] for item in data if item.get('Project')})
        logging.info(f"Found sender projects: {sender_projects}")

        combined_data = [
            data,
            dropdownvalues,
            [{'ID': user_id, 'Projects': projects}],
            session_data,
            sender_projects
        ]
        logging.info(f"Returning combined data with {len(data)} items")
        return combined_data

    except Exception as e:
        logging.error(f"Error in cart_items_function: {e}")
        return [[], {}, [], session_data, []]


