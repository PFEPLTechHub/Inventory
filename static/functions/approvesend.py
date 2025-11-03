from static.functions.db_connections_functions import execute_query  


from datetime import datetime

def approve_send_request_function(form_data):
    try:
        # Extract necessary fields from form_data
        transaction_uid = form_data[1]['Transaction_uid']
        ewayBill = str(form_data[0]['EwayBill']).strip()
        ewayreason = form_data[2]['ewayreason']

        # Query to check if the Transaction_uid exists and get approval status
        select_query = "SELECT ApprovalToSend FROM transaction_details WHERE Transaction_uid = %s"
        result = execute_query(select_query, (transaction_uid,))

        if not result:
            return "Transaction ID not found."

        approval_status = result[0]['ApprovalToSend']

        if approval_status == 1:
            return "This form has already been approved."
        elif approval_status == 2:
            return "This form has been disapproved and cannot be approved again."

        # Normalize ewayBill if blank
        if ewayBill == '':
            ewayBill = '-'

        approval_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if ewayreason == '-':
            update_query = """
                UPDATE transaction_details 
                SET EwayBillNo = %s, ApprovalToSend = 1, ApprovalToSendDate = %s, ewayreason = %s 
                WHERE Transaction_uid = %s
            """
            execute_query(update_query, (ewayBill, approval_date, ewayreason, transaction_uid), commit=True)
        else:
            update_query = """
                UPDATE transaction_details 
                SET EwayBillNo = 'No ewaybill', ApprovalToSend = 1, ApprovalToSendDate = %s, ewayreason = %s 
                WHERE Transaction_uid = %s
            """
            execute_query(update_query, (approval_date, ewayreason, transaction_uid), commit=True)

        return "Approval has been successfully given"

    except Exception as e:
        print(f"Error: {str(e)}")
        return f"Error: {str(e)}"


from static.functions.db_connections_functions import execute_query

def disapprove_send_request_function(form_data):
    try:
        transaction_uid = form_data['transaction_uid']
        remarks = form_data['remarks']

        # Check current approval status
        status_check_query = """
            SELECT ApprovalToSend 
            FROM transaction_details 
            WHERE Transaction_uid = %s
        """
        status_result = execute_query(status_check_query, (transaction_uid,))

        if not status_result:
            return "Transaction ID not found."

        approval_status = status_result[0]['ApprovalToSend']

        if approval_status == 1:
            return "This form has already been approved and cannot be disapproved."
        elif approval_status == 2:
            return "This form has already been disapproved."

        # Proceed to disapprove
        # 1. Get product IDs
        select_query = """
            SELECT ProductID 
            FROM transaction_product_details 
            WHERE Transaction_uid = %s
        """
        products = execute_query(select_query, (transaction_uid,))

        # 2. Reset is_initiate for each product
        update_inventory_query = """
            UPDATE inventory 
            SET is_initiate = 0 
            WHERE ProductID = %s
        """
        for product in products:
            execute_query(update_inventory_query, (product['ProductID'],), commit=True)

        # 3. Update disapproval status
        update_query = """
            UPDATE transaction_details 
            SET Status = %s, ApprovalToSend = %s, DisapproveRemarks = %s 
            WHERE Transaction_uid = %s
        """
        execute_query(update_query, (2, 2, remarks, transaction_uid), commit=True)

        return "Disapproval has been successfully recorded"

    except Exception as e:
        print(f"Error: {str(e)}")
        return f"Error: {str(e)}"
