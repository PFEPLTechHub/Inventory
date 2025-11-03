import pandas as pd
import json
from datetime import datetime
from flask import jsonify
import mysql.connector
from static.functions.db_connections_functions import execute_query  # Import the execute_query function from the db_connections_functions module

def approval_table_function(projects, session_data):
    try:
        print("[DEBUG] Received projects:", projects)
        print("[DEBUG] Received session_data:", session_data)

        if not projects:
            print("[DEBUG] No valid projects in session. Returning empty data.")
            return jsonify({
                "filtered_data": [],
                "session_data": session_data
            })

        placeholders = ', '.join(['%s'] * len(projects))
        
        # Determine user role and manager_index_id
        user_name = session_data.get('Name', '')
        user_id = session_data.get('ID', '')  # This is the login ID
        manager_index_id = session_data.get('manager_index_id')  # This will be None for regular users
        
        print(f"[DEBUG] User name: {user_name}")
        print(f"[DEBUG] User ID (login ID): {user_id}")
        print(f"[DEBUG] Manager index ID: {manager_index_id}")
        
        # Check if user is a manager and get their role
        is_sender_manager = False
        is_receiver_manager = False
        
        if manager_index_id:
            # User is a manager - check their role based on projects they manage
            print(f"[DEBUG] User is a manager with manager_index_id: {manager_index_id}")
            
            # Debug: Check all transactions in the database to understand the data
            debug_all_query = """
            SELECT 
                Transaction_uid,
                ApprovalToSend,
                ApprovalToReceive,
                IsReceive,
                Status,
                Source,
                Destination,
                InitiationDate
            FROM transaction_details 
            ORDER BY InitiationDate DESC
            LIMIT 20
            """
            debug_all_result = execute_query(debug_all_query)
            print("[DEBUG] All transactions in database (last 20):", debug_all_result)
            
            # Debug: Check what projects this manager is actually responsible for
            manager_projects_query = f"""
            SELECT project_id, Projects FROM projects_managers 
            WHERE Manager = %s
            """
            manager_projects_result = execute_query(manager_projects_query, (manager_index_id,))
            print(f"[DEBUG] Projects this manager is responsible for: {manager_projects_result}")
            
            # Check if this manager is responsible for any of the projects as source (sender manager)
            sender_manager_query = f"""
            SELECT COUNT(*) as count FROM projects_managers 
            WHERE Manager = %s AND project_id IN ({placeholders})
            """
            sender_result = execute_query(sender_manager_query, (manager_index_id,) + tuple(projects))
            is_sender_manager = sender_result[0]['count'] > 0 if sender_result else False
            
            # Check if this manager is responsible for any of the projects as destination (receiver manager)
            receiver_manager_query = f"""
            SELECT COUNT(*) as count FROM projects_managers 
            WHERE Manager = %s AND project_id IN ({placeholders})
            """
            receiver_result = execute_query(receiver_manager_query, (manager_index_id,) + tuple(projects))
            is_receiver_manager = receiver_result[0]['count'] > 0 if receiver_result else False
            
            print(f"[DEBUG] Is sender manager: {is_sender_manager}")
            print(f"[DEBUG] Is receiver manager: {is_receiver_manager}")
            
            # Debug: Check what pending transactions this manager should see based on their role
            if is_sender_manager:
                pending_send_query = f"""
                SELECT 
                    Transaction_uid,
                    ApprovalToSend,
                    ApprovalToReceive,
                    IsReceive,
                    Status,
                    Source,
                    Destination
                FROM transaction_details 
                WHERE Source IN ({placeholders})
                AND ApprovalToSend = 0 AND ApprovalToReceive = 0 AND Status = 0
                ORDER BY InitiationDate DESC
                """
                pending_send_result = execute_query(pending_send_query, tuple(projects))
                print(f"[DEBUG] Pending send approvals for this manager: {pending_send_result}")
            
            if is_receiver_manager and not is_sender_manager:
                pending_receive_query = f"""
                SELECT 
                    Transaction_uid,
                    ApprovalToSend,
                    ApprovalToReceive,
                    IsReceive,
                    Status,
                    Source,
                    Destination
                FROM transaction_details 
                WHERE Destination IN ({placeholders})
                AND ApprovalToSend = 1 AND ApprovalToReceive = 0 AND IsReceive = 1 AND Status = 0
                ORDER BY InitiationDate DESC
                """
                pending_receive_result = execute_query(pending_receive_query, tuple(projects))
                print(f"[DEBUG] Pending receive approvals for this manager: {pending_receive_result}")
            
            # Debug: Check ALL transactions that match receiver manager criteria (regardless of destination)
            all_receive_candidates_query = """
            SELECT 
                Transaction_uid,
                ApprovalToSend,
                ApprovalToReceive,
                IsReceive,
                Status,
                Source,
                Destination
            FROM transaction_details 
            WHERE ApprovalToSend = 1 AND ApprovalToReceive = 0 AND IsReceive = 1 AND Status = 0
            ORDER BY InitiationDate DESC
            """
            all_receive_candidates = execute_query(all_receive_candidates_query)
            print(f"[DEBUG] ALL transactions that match receiver manager criteria: {all_receive_candidates}")
            
            # Debug: Check what destinations these transactions have
            if all_receive_candidates:
                dest_ids = [str(t['Destination']) for t in all_receive_candidates]
                dest_placeholders = ','.join(['%s'] * len(dest_ids))
                dest_query = f"""
                SELECT project_id, Projects FROM projects_managers 
                WHERE project_id IN ({dest_placeholders})
                """
                dest_result = execute_query(dest_query, dest_ids)
                print(f"[DEBUG] Destination projects for pending receive approvals: {dest_result}")
            
            # FIXED: Determine the manager's primary role
            # If manager manages both source and destination projects, we need to check which type of approval they need to see
            if is_sender_manager and is_receiver_manager:
                print("[DEBUG] Manager manages both source and destination projects - checking for pending approvals")
                
                # Check if there are any pending send approvals
                pending_send_count_query = f"""
                SELECT COUNT(*) as count FROM transaction_details 
                WHERE Source IN ({placeholders})
                AND ApprovalToSend = 0 AND ApprovalToReceive = 0 AND Status = 0
                """
                pending_send_count = execute_query(pending_send_count_query, tuple(projects))
                pending_send_count = pending_send_count[0]['count'] if pending_send_count else 0
                
                # Check if there are any pending receive approvals
                pending_receive_count_query = f"""
                SELECT COUNT(*) as count FROM transaction_details 
                WHERE Destination IN ({placeholders})
                AND ApprovalToSend = 1 AND ApprovalToReceive = 0 AND IsReceive = 1 AND Status = 0
                """
                pending_receive_count = execute_query(pending_receive_count_query, tuple(projects))
                pending_receive_count = pending_receive_count[0]['count'] if pending_receive_count else 0
                
                print(f"[DEBUG] Pending send approvals: {pending_send_count}, Pending receive approvals: {pending_receive_count}")
                
                # If there are pending receive approvals and no pending send approvals, show receive approvals
                if pending_receive_count > 0 and pending_send_count == 0:
                    is_sender_manager = False
                    print("[DEBUG] No pending send approvals, showing receive approvals")
                elif pending_send_count > 0:
                    is_receiver_manager = False
                    print("[DEBUG] Pending send approvals exist, prioritizing sender role")
                else:
                    # If no pending approvals of either type, default to sender role
                    is_receiver_manager = False
                    print("[DEBUG] No pending approvals, defaulting to sender role")
        else:
            # User is not a manager - they shouldn't see any approvals
            print("[DEBUG] User is not a manager - no approvals to show")
            return jsonify({
                "filtered_data": [],
                "session_data": session_data
            })

        filtered_data = []
        
        # Only show send approvals if user is a sender manager
        if is_sender_manager:
            print("[DEBUG] Fetching send approvals for sender manager")
            
            # Debug: Check what transactions exist for the source projects
            debug_source_query = f"""
            SELECT 
                td.Transaction_uid,
                td.ApprovalToSend,
                td.ApprovalToReceive,
                td.IsReceive,
                td.Status,
                td.Source,
                td.Destination,
                pm_source.Projects AS SourceName
            FROM transaction_details td
            LEFT JOIN projects_managers pm_source ON td.Source = pm_source.project_id
            WHERE td.Source IN ({placeholders})
            ORDER BY td.InitiationDate DESC
            LIMIT 10
            """
            debug_source_result = execute_query(debug_source_query, tuple(projects))
            print("[DEBUG] All transactions for source projects:", debug_source_result)
            
            # Sent Items Query - Show only pending send approvals for sender manager's projects
            query_sent_items = f"""
            SELECT 
                td.Transaction_uid,
                td.EwayBillNo,
                td.Source,
                pm_source.Projects AS SourceName,
                td.Destination,
                pm_dest.Projects AS DestinationName,
                td.InitiationDate,
                td.Status,
                'Send' AS ApprovalType,
                COALESCE(sender_info.Name, sender_mgr.Name) AS SenderName,
                COALESCE(receiver_info.Name, receiver_mgr.Name) AS ReceiverName
            FROM transaction_details td
        
            LEFT JOIN user_info sender_info
                ON td.Sender_uid = sender_info.userinfo_uid
            LEFT JOIN managers_data sender_mgr
                ON td.Sender_uid = sender_mgr.manager_index_id

            LEFT JOIN user_info receiver_info
                ON td.Receiver_uid = receiver_info.userinfo_uid
            LEFT JOIN managers_data receiver_mgr
                ON td.Receiver_uid = receiver_mgr.manager_index_id

            LEFT JOIN projects_managers pm_source
                ON td.Source = pm_source.project_id
            LEFT JOIN projects_managers pm_dest
                ON td.Destination = pm_dest.project_id

            WHERE td.ApprovalToSend = 0
              AND td.ApprovalToReceive = 0
              AND td.Status = 0
              AND td.Source IN ({placeholders})
              AND td.ApprovalToSend != 2  -- Exclude disapproved send forms
            """

            sent_items_data = execute_query(query_sent_items, tuple(projects))
            print("[DEBUG] Sent items query result:", sent_items_data)
            print("[DEBUG] Sent items count:", len(sent_items_data) if sent_items_data else 0)
            
            if sent_items_data:
                filtered_data.extend(sent_items_data)

        # Only show receive approvals if user is a receiver manager (and NOT a sender manager)
        if is_receiver_manager and not is_sender_manager:
            print("[DEBUG] Fetching receive approvals for receiver manager")
            
            # Debug: Check what transactions exist for the destination projects
            debug_dest_query = f"""
            SELECT 
                td.Transaction_uid,
                td.ApprovalToSend,
                td.ApprovalToReceive,
                td.IsReceive,
                td.Status,
                td.Source,
                td.Destination,
                pm_dest.Projects AS DestinationName
            FROM transaction_details td
            LEFT JOIN projects_managers pm_dest ON td.Destination = pm_dest.project_id
            WHERE td.Destination IN ({placeholders})
            ORDER BY td.InitiationDate DESC
            LIMIT 10
            """
            debug_dest_result = execute_query(debug_dest_query, tuple(projects))
            print("[DEBUG] All transactions for destination projects:", debug_dest_result)
            
            # Received Items Query - Show only pending receive approvals for receiver manager's projects
            # UPDATED: Show transactions that have approved items waiting for receiver manager approval
            query_received_items = f"""
            SELECT DISTINCT
                td.Transaction_uid,
                td.EwayBillNo,
                td.Source,
                pm_source.Projects AS SourceName,
                td.Destination,
                pm_dest.Projects AS DestinationName,
                td.InitiationDate,
                td.Status,
                'Receive' AS ApprovalType,
                COALESCE(sender_info.Name, sender_mgr.Name) AS SenderName,
                COALESCE(receiver_info.Name, receiver_mgr.Name) AS ReceiverName
            FROM transaction_details td
           
            LEFT JOIN user_info sender_info
                ON td.Sender_uid = sender_info.userinfo_uid
            LEFT JOIN managers_data sender_mgr
                ON td.Sender_uid = sender_mgr.manager_index_id

            LEFT JOIN user_info receiver_info
                ON td.Receiver_uid = receiver_info.userinfo_uid
            LEFT JOIN managers_data receiver_mgr
                ON td.Receiver_uid = receiver_mgr.manager_index_id

            LEFT JOIN projects_managers pm_source
                ON td.Source = pm_source.project_id
            LEFT JOIN projects_managers pm_dest
                ON td.Destination = pm_dest.project_id

            INNER JOIN transaction_product_details tpd ON td.Transaction_uid = tpd.Transaction_uid

            WHERE td.ApprovalToSend = 1
              AND td.ApprovalToReceive = 0
              AND COALESCE(td.IsReceive, 0) = 1
              AND td.Status = 0
              AND td.Destination IN ({placeholders})
              AND td.ApprovalToReceive != 2  -- Exclude disapproved receive forms
              AND tpd.item_status = 1  -- Only show transactions with approved items
            """

            received_items_data = execute_query(query_received_items, tuple(projects))
            print("[DEBUG] Received items query result:", received_items_data)
            print("[DEBUG] Received items count:", len(received_items_data) if received_items_data else 0)
            
            if received_items_data:
                filtered_data.extend(received_items_data)
        
        # Debug: Check the actual status of transactions that are showing up
        if filtered_data:
            transaction_uids = [item['Transaction_uid'] for item in filtered_data]
            placeholders = ', '.join(['%s'] * len(transaction_uids))
            debug_query = f"""
            SELECT Transaction_uid, ApprovalToSend, ApprovalToReceive, Status, IsReceive, CompletionDate, 
                   CASE 
                       WHEN CompletionDate IS NULL THEN 'NULL'
                       WHEN CompletionDate = '' THEN 'EMPTY'
                       WHEN CompletionDate = '0' THEN 'ZERO'
                       ELSE 'VALID: ' || CompletionDate
                   END as CompletionDateStatus
            FROM transaction_details 
            WHERE Transaction_uid IN ({placeholders})
            """
            debug_result = execute_query(debug_query, tuple(transaction_uids))
            print("[DEBUG] Current status of transactions in approval table:", debug_result)

        # Remove duplicates and sort
        seen_transactions = set()
        final_filtered_data = []

        for row in filtered_data:
            if row['Transaction_uid'] not in seen_transactions:
                final_filtered_data.append(row)
                seen_transactions.add(row['Transaction_uid'])

        final_filtered_data.sort(key=lambda x: x['InitiationDate'], reverse=True)
        print("[DEBUG] Final filtered data count:", len(final_filtered_data))
        print("[DEBUG] Final filtered data:", final_filtered_data)

        # Replace Source and Destination with their names
        filtered_data_named = []
        for row in final_filtered_data:
            new_row = row.copy()
            new_row['Source'] = row.get('SourceName', row.get('Source'))
            new_row['Destination'] = row.get('DestinationName', row.get('Destination'))
            new_row.pop('SourceName', None)
            new_row.pop('DestinationName', None)
            filtered_data_named.append(new_row)

        return jsonify({
            "filtered_data": filtered_data_named,
            "session_data": session_data
        })

    except mysql.connector.Error as err:
        return jsonify({'error': f"MySQL error: {str(err)}"})

    except Exception as e:
        return jsonify({'error': str(e)})







