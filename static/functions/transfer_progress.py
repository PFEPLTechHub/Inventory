# from flask import jsonify
# from static.functions.db_connections_functions import execute_query
# from static.functions.common_functions import extract_transaction_data

# def transfer_progress_table_data_function(transaction_uid):
#     try:
#         # Use the common extract_transaction_data function to get consistent data
#         # This function already includes the JOIN to get manager names
#         data = extract_transaction_data(transaction_uid)
        
#         if "error" in data:

#             return jsonify({"error": data["error"]}), 500
            
#         if not data["transaction_details"]:
#             return jsonify({"error": "Transaction not found"}), 404

#         row = data["transaction_details"][0]
#         ats = row.get("ApprovalToSend", 0)
#         atr = row.get("ApprovalToReceive", 0)
      
        
#         if ats == 0 and atr == 0:
#             transaction_type = "Send Not Approved"
#         elif ats == 1 and atr == 0:
#             transaction_type = "Receive Not Approved"
#         elif ats == 1 and atr == 1:
#             transaction_type = "Transaction Complete"
#         else:
#             transaction_type = "Unknown"

#         # Build response with the transaction details and project_managers
#         response = {
#             "Transaction_uid": row["Transaction_uid"],
#             "EwayBillNo": row.get("EwayBillNo", ""),
#             "Source": row.get("Source", ""),
#             "Destination": row.get("Destination", ""),
#             "Sender_uid": row.get("Sender_uid", ""),
#             "Receiver_uid": row.get("Receiver_uid", ""),
#             "InitiationDate": row.get("InitiationDate", ""),
#             "Status": row.get("Status", ""),
#             "TransactionType": transaction_type,
#             "project_managers": data["project_managers"]  # Include project_managers with ManagerName
#         }
        
#         return jsonify(response)
#     except Exception as e:
#         print(f"Error in transfer_progress_table_data_function: {str(e)}")
#         return jsonify({"error": "Error processing data"}), 500