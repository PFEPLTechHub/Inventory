from flask import jsonify
from static.functions.db_connections_functions import execute_query  # Ensure this import is correct

def add_category(data):
    try:
        # Extract the category name from the data
        category_name = data['category_name']
        print(f"Adding category: {category_name}")  # Debugging statement

        # SQL query to insert the new category into the categories table
        insert_query = """
            INSERT INTO categories (category_name) 
            VALUES (%s)
        """
        params = (category_name,)

        # Execute the query using the execute_query function
        execute_query(insert_query, params, commit=True)

        # Return a success message
        return jsonify({"message": "Category added successfully"})

    except Exception as e:
        # Handle any errors and return the error message
        print(f"Error in add_category: {str(e)}")
        return jsonify({"message": f"Error: {str(e)}"}), 500




