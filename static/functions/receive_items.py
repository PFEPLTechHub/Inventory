import mysql.connector
from flask import jsonify
from datetime import datetime
import pandas as pd
from static.functions.db_connections_functions import execute_query


def receive_items_table_data_function(name, session_data):
    try:
        print(f"Function called with name: {name}")

        # Step 1: Try to get receiver ID from managers_data first
        query_get_manager_id = """
        SELECT manager_index_id 
        FROM managers_data 
        WHERE name = %s
        """
        print(f"Executing query to fetch manager_index_id: {query_get_manager_id} with parameter: {name}")
        manager_result = execute_query(query_get_manager_id, (name,))
        print(f"Manager lookup result: {manager_result}")

        if manager_result:
            receiver_uid = manager_result[0]['manager_index_id']
            receiver_type = 'manager'
            print(f"Found receiver as manager: {receiver_uid}")
        else:
            # Step 2: If not found in managers_data, check user_info
            query_get_userinfo_uid = """
            SELECT userinfo_uid 
            FROM user_info 
            WHERE name = %s
            """
            print(f"Executing query to fetch userinfo_uid: {query_get_userinfo_uid} with parameter: {name}")
            userinfo_result = execute_query(query_get_userinfo_uid, (name,))
            print(f"User lookup result: {userinfo_result}")

            if not userinfo_result:
                print(f"No receiver found with name: {name} in both managers_data and user_info")
                return jsonify({"error": "Receiver name not found in managers or users"})

            receiver_uid = userinfo_result[0]['userinfo_uid']
            receiver_type = 'user'
            print(f"Found receiver as user: {receiver_uid}")

        # Step 3: Fetch transactions with joins on both tables for Receiver and Sender
        # UPDATED: Show transactions that have at least one pending item (item_status IS NULL)
        query = """
        SELECT DISTINCT td.*, 
               COALESCE(md.Name, ui.Name) AS ReceiverName,
               COALESCE(smd.Name, sui.Name) AS SenderName
        FROM transaction_details td
        LEFT JOIN managers_data md ON td.Receiver_uid = md.manager_index_id
        LEFT JOIN user_info ui ON td.Receiver_uid = ui.userinfo_uid
        LEFT JOIN managers_data smd ON td.Sender_uid = smd.manager_index_id
        LEFT JOIN user_info sui ON td.Sender_uid = sui.userinfo_uid
        WHERE td.Receiver_uid = %s
          AND td.ApprovalToSend = 1
          AND td.ApprovalToReceive = 0
          AND td.Status != 2  -- Exclude disapproved transactions
          AND td.IsReceive != 2  -- Exclude disapproved receive transactions
          AND (td.CompletionDate IS NULL OR td.CompletionDate = '' OR td.CompletionDate = '0' OR td.CompletionDate = '-')
          AND EXISTS (
              SELECT 1 FROM transaction_product_details tpd 
              WHERE tpd.Transaction_uid = td.Transaction_uid 
              AND tpd.item_status IS NULL
          )
        ORDER BY td.InitiationDate DESC
        """
        print(f"Executing query: {query} with parameter: {receiver_uid}")
        filtered_data = execute_query(query, (receiver_uid,))
        print(f"Raw query result count: {len(filtered_data) if filtered_data else 0}")

        if not filtered_data:
            print("No data found for the given receiver.")
            # Debug: Let's check what transactions exist for this receiver
            debug_query = """
            SELECT Transaction_uid, ApprovalToSend, ApprovalToReceive, CompletionDate, Status, IsReceive
            FROM transaction_details 
            WHERE Receiver_uid = %s
            ORDER BY InitiationDate DESC
            """
            debug_result = execute_query(debug_query, (receiver_uid,))
            print(f"Debug - All transactions for receiver {receiver_uid}: {debug_result}")
            
            # Also check for any transactions with ApprovalToSend = 1 regardless of receiver
            debug_query2 = """
            SELECT Transaction_uid, Receiver_uid, ApprovalToSend, ApprovalToReceive, CompletionDate, Status, IsReceive
            FROM transaction_details 
            WHERE ApprovalToSend = 1 AND ApprovalToReceive = 0
            ORDER BY InitiationDate DESC
            """
            debug_result2 = execute_query(debug_query2)
            print(f"Debug - All transactions with ApprovalToSend=1 and ApprovalToReceive=0: {debug_result2}")
            
            # Check item_status in transaction_product_details
            debug_query3 = """
            SELECT tpd.Transaction_uid, tpd.ProductID, tpd.item_status, td.ApprovalToSend, td.ApprovalToReceive
            FROM transaction_product_details tpd
            JOIN transaction_details td ON tpd.Transaction_uid = td.Transaction_uid
            WHERE td.ApprovalToSend = 1 AND td.ApprovalToReceive = 0
            ORDER BY tpd.Transaction_uid
            """
            debug_result3 = execute_query(debug_query3)
            print(f"Debug - item_status for transactions with ApprovalToSend=1 and ApprovalToReceive=0: {debug_result3}")
            
            return jsonify({
                "filtered_data": [],
                "session_data": session_data
            })

        print(f"Filtered data: {filtered_data}")

        # Step 4: Remove duplicates based on Transaction_uid
        df = pd.DataFrame(filtered_data)
        print(f"DataFrame created with {len(df)} rows.")
        df = df.drop_duplicates(subset='Transaction_uid', keep='first')
        print(f"DataFrame after removing duplicates has {len(df)} rows.")
        filtered_data_unique = df.to_dict(orient='records')
        print(f"Filtered data after conversion to dictionary: {filtered_data_unique}")

        # Step 5: Attach SourceName and DestinationName to each transaction (after deduplication)
        project_ids = set()
        for record in filtered_data_unique:
            if 'Source' in record:
                project_ids.add(record['Source'])
            if 'Destination' in record:
                project_ids.add(record['Destination'])
        if project_ids:
            placeholders = ','.join(['%s'] * len(project_ids))
            project_name_query = f"SELECT project_id, Projects FROM projects_managers WHERE project_id IN ({placeholders})"
            project_names = execute_query(project_name_query, tuple(project_ids))
            project_id_to_name = {str(row['project_id']): row['Projects'] for row in project_names}
            for record in filtered_data_unique:
                record['SourceName'] = project_id_to_name.get(str(record.get('Source')), record.get('Source'))
                record['DestinationName'] = project_id_to_name.get(str(record.get('Destination')), record.get('Destination'))

        # Step 6: Only include user-friendly fields in the response
        fields_to_send = [
            'Transaction_uid', 'EwayBillNo', 'SourceName', 'DestinationName',
            'SenderName', 'ReceiverName', 'InitiationDate', 'Status',
            'ApprovalToSend', 'ApprovalToReceive', 'CompletionDate', 'DisapproveRemarks', 'ewayreason'
        ]
        filtered_data_final = [
            {k: record.get(k) for k in fields_to_send}
            for record in filtered_data_unique
        ]

        return jsonify({
            "filtered_data": filtered_data_final,
            "session_data": session_data
        })

    except mysql.connector.Error as err:
        print(f"MySQL error: {str(err)}")
        return jsonify({"error": f"MySQL error: {str(err)}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": f"Error: {str(e)}"})







def receive_approval_request_function(form_data):
    try:
        # Debug statement to log form data
        print(f"Received form data: {form_data}")

        transaction_id = form_data[0]['Transaction_uid']
        current_datetime = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        print(f"Processing Transaction ID: {transaction_id} at {current_datetime}")

        # Check if transaction already processed
        status_check_query = "SELECT IsReceive FROM transaction_details WHERE Transaction_uid = %s"
        status_result = execute_query(status_check_query, (transaction_id,))

        if not status_result:
            return "Invalid transaction ID."

        is_receive_status = status_result[0]['IsReceive']

        if is_receive_status == 1:
            return "Receiver has already approved this form."
        elif is_receive_status == 2:
            return "Receiver has already disapproved this form."

        # Map ReceiverCondition text to numeric value if needed
        condition_map = {'Good': 0, 'Not OK': 1, 'Damaged': 2, 0: 0, 1: 1, 2: 2}

        # Process only items explicitly sent by the client
        for form_item in form_data[1:]:
            product_id = form_item.get('ProductID')
            if not product_id:
                continue

            item_status = str(form_item.get('ItemStatus', '1'))  # default treat sent items as approved
            receiver_condition = form_item.get('ReceiverCondition', '')
            receiver_remark = form_item.get('ReceiverRemark', '')
            receiver_image = form_item.get('ReceiverImage', '')

            # Map condition to numeric value
            receiver_condition_numeric = condition_map.get(receiver_condition, 0)

            if item_status == '1':
                # Approved item
                update_query = """
                UPDATE transaction_product_details 
                SET ReceiverCondition = %s, 
                    ReceiverRemark = %s, 
                    ReceiverImage = %s,
                    item_status = '1'
                WHERE Transaction_uid = %s AND ProductID = %s
                """
                execute_query(update_query, (
                    receiver_condition_numeric,
                    receiver_remark,
                    receiver_image,
                    transaction_id,
                    product_id
                ), commit=True)
                print(f"Approved item {product_id} with condition {receiver_condition_numeric}")
            elif item_status == '2':
                # Explicitly disapproved item
                update_query = """
                UPDATE transaction_product_details 
                SET ReceiverCondition = NULL,
                    ReceiverRemark = %s,
                    item_status = '2'
                WHERE Transaction_uid = %s AND ProductID = %s
                """
                execute_query(update_query, (
                    receiver_remark,
                    transaction_id,
                    product_id
                ), commit=True)
                print(f"Disapproved item {product_id}")
            else:
                # Unknown or unsupported status; skip to keep it pending
                print(f"Skipping item {product_id} with unsupported ItemStatus {item_status}")

        # Check item status to determine IsReceive value
        check_item_status_query = """
        SELECT COUNT(*) as total_items,
               SUM(CASE WHEN item_status IS NULL THEN 1 ELSE 0 END) as pending_items,
               SUM(CASE WHEN item_status = '1' THEN 1 ELSE 0 END) as approved_items,
               SUM(CASE WHEN item_status = '2' THEN 1 ELSE 0 END) as disapproved_items
        FROM transaction_product_details 
        WHERE Transaction_uid = %s
        """
        
        items_status = execute_query(check_item_status_query, (transaction_id,))
        
        if items_status:
            total_items = items_status[0]['total_items']
            pending_items_count = items_status[0]['pending_items']
            approved_items_count = items_status[0]['approved_items']
            disapproved_items_count = items_status[0]['disapproved_items']
            
            print(f"Transaction {transaction_id} status: Total={total_items}, Pending={pending_items_count}, Approved={approved_items_count}, Disapproved={disapproved_items_count}")
            
            # Determine IsReceive value based on item status
            # Only update IsReceive when ALL items have been processed (approved or disapproved)
            if pending_items_count == 0:
                # All items have been processed (either approved or disapproved)
                if approved_items_count > 0:
                    # At least one item approved - mark transaction as received
                    completion_update = """
                    UPDATE transaction_details
                    SET CompletionDate = %s,
                        IsReceive = 1,
                        isReceiveDate = %s
                    WHERE Transaction_uid = %s
                    """
                    execute_query(completion_update, (current_datetime, current_datetime, transaction_id), commit=True)
                    print(f"Transaction {transaction_id} marked as received (IsReceive=1) - all items processed, {approved_items_count} approved")
                else:
                    # All items disapproved - mark transaction as disapproved
                    completion_update = """
                    UPDATE transaction_details
                                        UPDATE transaction_details
                    SET CompletionDate = %s,
                        IsReceive = 2,
                        isReceiveDate = %s,
                        Status = 2
                    WHERE Transaction_uid = %s
                    """
                    execute_query(completion_update, (current_datetime, current_datetime, transaction_id), commit=True)
                    print(f"Transaction {transaction_id} marked as disapproved (IsReceive=2) - all items disapproved")
            else:
                # Some items still pending - transaction remains pending, don't update IsReceive
                print(f"Transaction {transaction_id} has {pending_items_count} pending items - will continue to appear in receive table")

        return "Data processed successfully"

    except mysql.connector.Error as err:
        print(f"MySQL error: {str(err)}")
        return jsonify({"error": f"MySQL error: {str(err)}"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": f"Error: {str(e)}"})







def disapprove_receive_approval_request_function(form_data):
    try:
        transaction_id = form_data['Transaction_uid']
        remarks = form_data['remarks']
        current_datetime = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Check current receive status
        status_check_query = """
        SELECT IsReceive FROM transaction_details WHERE Transaction_uid = %s
        """
        status_result = execute_query(status_check_query, (transaction_id,))

        if not status_result:
            return "Invalid transaction ID."

        is_receive_status = status_result[0]['IsReceive']

        if is_receive_status == 1:
            return "This form has already been approved and cannot be disapproved."
        elif is_receive_status == 2:
            return "This form has already been disapproved."

        # Disapprove only selected items if provided; else fall back to "all pending"
        product_ids = form_data.get('product_ids', []) if isinstance(form_data, dict) else []
        if product_ids:
            placeholders = ','.join(['%s'] * len(product_ids))
            disapprove_selected_query = f"""
            UPDATE transaction_product_details
            SET ReceiverCondition = NULL,
                ReceiverRemark = %s,
                item_status = '2'
            WHERE Transaction_uid = %s AND ProductID IN ({placeholders})
            """
            execute_query(disapprove_selected_query, (remarks, transaction_id, *product_ids), commit=True)
            print(f"Disapproved selected items for transaction {transaction_id}: {product_ids}")
        else:
            pending_items_query = """
            SELECT COUNT(*) as pending_count
            FROM transaction_product_details 
            WHERE Transaction_uid = %s AND item_status IS NULL
            """
            pending_result = execute_query(pending_items_query, (transaction_id,))
            if pending_result and pending_result[0]['pending_count'] > 0:
                disapprove_pending_query = """
                UPDATE transaction_product_details 
                SET ReceiverCondition = NULL,
                    ReceiverRemark = %s,
                    item_status = '2'
                WHERE Transaction_uid = %s AND item_status IS NULL
                """
                execute_query(disapprove_pending_query, (remarks, transaction_id), commit=True)
                print(f"Disapproved {pending_result[0]['pending_count']} pending items for transaction {transaction_id}")
        
        # Now check if all items have been processed
        check_item_status_query = """
        SELECT COUNT(*) as total_items,
               SUM(CASE WHEN item_status IS NULL THEN 1 ELSE 0 END) as pending_items,
               SUM(CASE WHEN item_status = '1' THEN 1 ELSE 0 END) as approved_items,
               SUM(CASE WHEN item_status = '2' THEN 1 ELSE 0 END) as disapproved_items
        FROM transaction_product_details 
        WHERE Transaction_uid = %s
        """
        
        items_status = execute_query(check_item_status_query, (transaction_id,))
        
        if items_status:
            total_items = items_status[0]['total_items']
            pending_items_count = items_status[0]['pending_items']
            approved_items_count = items_status[0]['approved_items']
            disapproved_items_count = items_status[0]['disapproved_items']
            
            print(f"Transaction {transaction_id} status after disapproval: Total={total_items}, Pending={pending_items_count}, Approved={approved_items_count}, Disapproved={disapproved_items_count}")
            
            # Only update IsReceive if all items have been processed
            if pending_items_count == 0:
                # All items are processed (either approved or disapproved)
                if approved_items_count > 0:
                    # At least one item approved → transaction considered received
                    completion_update = """
                    UPDATE transaction_details
                    SET CompletionDate = %s,
                        IsReceive = 1,
                        isReceiveDate = %s,
                        DisapproveRemarks = %s
                    WHERE Transaction_uid = %s
                    """
                    execute_query(completion_update, (current_datetime, current_datetime, remarks, transaction_id), commit=True)
                    print(f"Transaction {transaction_id} marked as received (IsReceive=1) after disapproval flow - at least one item approved")
                else:
                    # All items disapproved → transaction fully disapproved
                    completion_update = """
                                        UPDATE transaction_details
                    SET CompletionDate = %s,
                        IsReceive = 2,
                        isReceiveDate = %s,
                        DisapproveRemarks = %s,
                        Status = 2
                    WHERE Transaction_uid = %s
                    """
                    execute_query(completion_update, (current_datetime, current_datetime, remarks, transaction_id), commit=True)
                    print(f"Transaction {transaction_id} marked as disapproved (IsReceive=2) - all items disapproved")
            else:
                # Some items still pending - transaction remains pending
                print(f"Transaction {transaction_id} has {pending_items_count} pending items - will continue to appear in receive table")

        return "Disapproval has been successfully recorded"

    except mysql.connector.Error as err:
        return jsonify({"error": f"MySQL error: {str(err)}"})
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"})








def get_form_data_function(transaction_uid):
    print(f"[DEBUG] get_form_data_function called with transaction_uid: {transaction_uid}")
    try:
        # Get transaction details
        transaction_details_query = """
        SELECT 
            td.Transaction_uid,
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

        # Get product details - UPDATED: Show only pending items using item_status
        product_details_query = """
        SELECT 
            tpd.*,
            i.Name,
            i.Category,
            i.Make,
            i.Model,
            i.ProductSerial
        FROM transaction_product_details tpd
        LEFT JOIN inventory i ON tpd.ProductID = i.ProductID
        WHERE tpd.Transaction_uid = %s
          AND tpd.item_status IS NULL  -- Only show pending items (not approved or disapproved)
        ORDER BY tpd.ProductID
        """
        print(f"[DEBUG] Executing product details query for transaction {transaction_uid}")
        print(f"[DEBUG] Query: {product_details_query}")
        product_details = execute_query(product_details_query, (transaction_uid,))
        print(f"[DEBUG] Product details returned: {len(product_details) if product_details else 0} items")
        print(f"[DEBUG] Product details data: {product_details}")
        
        # Debug: Check all items for this transaction
        debug_query = """
        SELECT ProductID, ReceiverCondition, ReceiverRemark
        FROM transaction_product_details 
        WHERE Transaction_uid = %s
        ORDER BY ProductID
        """
        debug_result = execute_query(debug_query, (transaction_uid,))
        print(f"[DEBUG] All items in transaction {transaction_uid}: {debug_result}")
        
        # Debug: Check specifically for NULL ReceiverCondition items
        null_condition_query = """
        SELECT ProductID, ReceiverCondition, ReceiverRemark
        FROM transaction_product_details 
        WHERE Transaction_uid = %s AND ReceiverCondition IS NULL
        ORDER BY ProductID
        """
        null_result = execute_query(null_condition_query, (transaction_uid,))
        print(f"[DEBUG] Items with NULL ReceiverCondition: {null_result}")

        # Get project manager names for the specific transaction's source and destination
        if transaction_details and len(transaction_details) > 0:
            source_project = transaction_details[0].get('Source')
            destination_project = transaction_details[0].get('Destination')
            
            print(f"[DEBUG] Getting managers for source: {source_project}, destination: {destination_project}")
            
            project_managers_query = """
            SELECT 
                pm.project_id,
                pm.Projects,
                COALESCE(md.Name, ui.Name) AS ManagerName
            FROM projects_managers pm
            LEFT JOIN managers_data md ON pm.Manager = md.manager_index_id
            LEFT JOIN user_info ui ON pm.Manager = ui.userinfo_uid
            WHERE pm.project_id IN (%s, %s)
            """
            project_managers = execute_query(project_managers_query, (source_project, destination_project))
            print(f"[DEBUG] Found {len(project_managers) if project_managers else 0} project managers")
        else:
            project_managers = []

        return jsonify({
            "transaction_details": transaction_details,
            "transaction_product_details": product_details,
            "project_managers": project_managers
        })

    except Exception as e:
        print(f"Error in get_form_data_function: {e}")
        return jsonify({"error": f"Error: {str(e)}"})







