from static.functions.db_connections_functions import execute_query

def fetch_product_transfer_history(filters):
    try:
        print("Received filters:", filters)  # Debug: Check the filters received
        
        query = """
            SELECT 
                t.Transaction_uid, t.InitiationDate, t.CompletionDate, 
                t.Source, pm_src.Projects AS SourceName, 
                t.Destination, pm_dest.Projects AS DestinationName, 
                t.Sender_uid, us.Name AS SenderName, 
                t.Receiver_uid, ur.Name AS ReceiverName, 
                t.Status,
                p.ProductID, p.SenderCondition, p.SenderRemark, p.SenderImage,
                p.ReceiverCondition, p.ReceiverRemark, p.ReceiverImage,
                i.Category, i.Name, i.Make, i.Model
            FROM 
                transaction_details t
            JOIN 
                transaction_product_details p ON t.Transaction_uid = p.Transaction_uid
            JOIN 
                inventory i ON p.ProductID = i.ProductID
            LEFT JOIN 
                projects_managers pm_src ON t.Source = pm_src.project_id
            LEFT JOIN 
                projects_managers pm_dest ON t.Destination = pm_dest.project_id
            LEFT JOIN 
                user_info us ON t.Sender_uid = us.userinfo_uid
            LEFT JOIN 
                user_info ur ON t.Receiver_uid = ur.userinfo_uid
        """

        where_clauses = []
        values = []

        # Build WHERE clause based on filters
        if filters.get("project"):
            where_clauses.append("i.Project = %s")
            values.append(filters["project"])
        if filters.get("owner"):
            where_clauses.append("i.Owner = %s")
            values.append(filters["owner"])
        if filters.get("category"):
            where_clauses.append("i.Category = %s")
            values.append(filters["category"])
        if filters.get("name"):
            where_clauses.append("i.Name = %s")
            values.append(filters["name"])
        if filters.get("make"):
            where_clauses.append("i.Make = %s")
            values.append(filters["make"])
        if filters.get("model"):
            where_clauses.append("i.Model = %s")
            values.append(filters["model"])

        print("WHERE Clauses:", where_clauses)  # Debug: Check the WHERE clauses
        print("Values to be used in query:", values)  # Debug: Check the values
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY t.Transaction_uid DESC"
        print("Final Query:", query)  # Debug: Check the final SQL query
        
        result = execute_query(query, values)
        print("Query result:", result)  # Debug: Check the result of the query

        grouped_data = {}

        # Process the result into grouped data
        for row in result:
            txn_id = row['Transaction_uid']
            if txn_id not in grouped_data:
                grouped_data[txn_id] = {
                    "transaction_details": {
                        "Transaction_uid": txn_id,
                        "InitiationDate": row["InitiationDate"],
                        "CompletionDate": row["CompletionDate"],
                        "Source": row["SourceName"] or row["Source"],
                        "Destination": row["DestinationName"] or row["Destination"],
                        "Sender_uid": row["SenderName"] or row["Sender_uid"],
                        "Receiver_uid": row["ReceiverName"] or row["Receiver_uid"],
                        "Status": row["Status"],
                        "products": []
                    }
                }

            grouped_data[txn_id]["transaction_details"]["products"].append({
                "ProductID": row["ProductID"],
                "SenderCondition": row["SenderCondition"],
                "SenderRemark": row["SenderRemark"],
                "SenderImage": row["SenderImage"],
                "ReceiverCondition": row["ReceiverCondition"],
                "ReceiverRemark": row["ReceiverRemark"],
                "ReceiverImage": row["ReceiverImage"],
                "Category": row["Category"],
                "Name": row["Name"],
                "Make": row["Make"],
                "Model": row["Model"]
            })

        print("Grouped data:", grouped_data)  # Debug: Check the grouped data

        return list(grouped_data.values())

    except Exception as e:
        print("Error fetching product transfer history:", e)
        return []   


