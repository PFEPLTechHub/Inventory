from flask import Flask, jsonify
import json
from static.functions.db_connections_functions import execute_query  # Import execute_query

# Function to get inventory data based on 'Owner' (name)
def my_invent_dashboard_function(name, session_data):
    try:
        # Debug: Print name parameter
        print(f"my_invent_dashboard_function called with name: '{name}'")
        print(f"Session data: {session_data}")
        
        # Query to fetch inventory data where 'Owner' matches the given name, joining with user_info, managers_data, and projects_managers to get owner and project name
        query = """
            SELECT i.*, COALESCE(ui.Name, m.Name) AS OwnerName, pm.Projects AS ProjectName
            FROM inventory i
            LEFT JOIN user_info ui ON i.Owner = ui.ID
            LEFT JOIN managers_data m ON i.Owner = m.ID
            LEFT JOIN projects_managers pm ON i.project_id = pm.project_id
            WHERE i.Owner = %s
        """
        
        # Execute the query using the execute_query function
        filtered_data = execute_query(query, (name,))
        
        # Debug: Print results
        print(f"Query returned {len(filtered_data)} records for owner '{name}'")
        if len(filtered_data) == 0:
            # Try alternative query with ID instead of Name
            user_id = session_data.get('ID')
            if user_id:
                print(f"Trying alternative query with ID: {user_id}")
                alt_query = """
                    SELECT i.*, COALESCE(ui.Name, m.Name) AS OwnerName, pm.Projects AS ProjectName
                    FROM inventory i
                    LEFT JOIN user_info ui ON i.Owner = ui.ID
                    LEFT JOIN managers_data m ON i.Owner = m.ID
                    LEFT JOIN projects_managers pm ON i.project_id = pm.project_id
                    WHERE i.Owner = %s
                """
                filtered_data = execute_query(alt_query, (user_id,))
                print(f"Alternative query returned {len(filtered_data)} records")
            
            # If still no data, try with employee ID number
            if len(filtered_data) == 0:
                print("Trying query for all inventory data as fallback")
                fallback_query = """
                    SELECT i.*, COALESCE(ui.Name, m.Name) AS OwnerName, pm.Projects AS ProjectName
                    FROM inventory i
                    LEFT JOIN user_info ui ON i.Owner = ui.ID
                    LEFT JOIN managers_data m ON i.Owner = m.ID
                    LEFT JOIN projects_managers pm ON i.project_id = pm.project_id
                """
                all_data = execute_query(fallback_query)
                print(f"Fallback query returned {len(all_data)} total inventory records")
                print(f"Available Owner values: {set(item.get('Owner', '') for item in all_data)}")
        
        # Combine filtered data with session data
        combined_data = {
            "filtered_data": filtered_data,
            "session_data": session_data
        }

        # Return JSON object
        return jsonify(combined_data)
    
    except Exception as e:
        # Catch any exceptions and return the error as JSON
        print(f"Error in my_invent_dashboard_function: {str(e)}")
        return jsonify({'error': str(e)})



# Function to get inventory data based on 'Project'
def my_project_dashboard_function(projects, session_data):
    try:
        # Debug prints
        print("Project data received:", projects)
        print("Session data:", session_data)
        
        # Handle different input types for projects
        if not projects:  # Check if projects is empty or None
            print("No projects provided")
            return jsonify({
                "filtered_data": [],
                "session_data": session_data
            })
        
        # Ensure 'projects' is a list of strings (project IDs)
        if isinstance(projects, str):
            if ',' in projects:
                projects = [p.strip() for p in projects.split(',')]
            else:
                projects = [projects]
        projects = [str(p) for p in projects if p and str(p).strip()]

        print("Processed projects list (IDs):", projects)

        if not projects:
            print("No valid projects after processing")
            return jsonify({
                "filtered_data": [],
                "session_data": session_data
            })

        try:
            # Create the query placeholders for the project_id list
            projects_placeholder = ', '.join(['%s'] * len(projects))

            # Join inventory with projects_managers and user_info to get actual project names and owner names
            query = f'''
            SELECT i.*, pm.Projects AS Project, pm.project_id, ui.Name AS OwnerName
            FROM inventory i
            JOIN projects_managers pm ON i.project_id = pm.project_id
            LEFT JOIN user_info ui ON i.Owner = ui.ID
            WHERE pm.project_id IN ({projects_placeholder})
            '''

            print("Executing query:", query)
            print("Query parameters:", projects)

            # Execute the query using the execute_query function
            filtered_data = execute_query(query, projects)
            print(f"Query returned {len(filtered_data)} records")

            # Ensure data has consistent field names
            normalized_data = []
            for item in filtered_data:
                normalized_item = {}
                for key, value in item.items():
                    if key == 'Project':
                        normalized_item['Project'] = value  # Project name
                    elif key == 'OwnerName':
                        normalized_item['OwnerName'] = value
                    elif key == 'project_id':
                        normalized_item['project_id'] = value
                    else:
                        normalized_item[key] = value
                normalized_data.append(normalized_item)

            # Combine filtered data with session data
            combined_data = {
                "filtered_data": normalized_data,
                "session_data": session_data
            }

            # Return filtered data as JSON
            return jsonify(combined_data)
        except Exception as query_error:
            print(f"Error executing query: {str(query_error)}")
            
            # If the join query fails, try a simpler approach
            # First, get the project_id to Projects mapping
            try:
                project_mapping_query = "SELECT project_id, Projects FROM projects_managers"
                project_mapping = execute_query(project_mapping_query)
                
                # Create a dict for quick lookup: project_id -> Projects
                id_to_project = {str(item['project_id']): item['Projects'] for item in project_mapping}
                print("Project mapping:", id_to_project)
                
                # Now get inventory items
                inventory_query = "SELECT * FROM inventory"
                inventory_data = execute_query(inventory_query)
                
                # Filter and enrich the inventory data
                normalized_data = []
                for item in inventory_data:
                    project_id = str(item.get('project_id', ''))
                    
                    # If we have a mapping for this project_id and it's in our target projects
                    if project_id in id_to_project and id_to_project[project_id] in projects:
                        item_copy = dict(item)  # Make a copy to avoid modifying the original
                        item_copy['Project'] = id_to_project[project_id]  # Add the project name
                        normalized_data.append(item_copy)
                
                print(f"Fallback method returned {len(normalized_data)} records")
                
                return jsonify({
                    "filtered_data": normalized_data,
                    "session_data": session_data
                })
            except Exception as fallback_error:
                print(f"Fallback method error: {str(fallback_error)}")
                # If all else fails, return empty data
                return jsonify({
                    "filtered_data": [],
                    "session_data": session_data
                })
    
    except Exception as e:
        # Catch any exceptions and return the error as JSON
        print(f"Error in my_project_dashboard_function: {str(e)}")
        return jsonify({'error': str(e)})

        

# Function to get all inventory data
def invent_dashboard_function(session_data):
    try:
        # Query to fetch all inventory data with owner name and project name
        query = """
        SELECT i.*, COALESCE(ui.Name, m.Name) AS OwnerName, pm.Projects AS ProjectName
        FROM inventory i
        LEFT JOIN user_info ui ON i.Owner = ui.ID
        LEFT JOIN managers_data m ON i.Owner = m.ID
        LEFT JOIN projects_managers pm ON i.project_id = pm.project_id
        """
        # Execute the query using the execute_query function
        inventory_data = execute_query(query)
        # Debug info
        print(f"Inventory data fetched: {len(inventory_data)} records")
        if inventory_data and len(inventory_data) > 0:
            print(f"Sample record keys: {list(inventory_data[0].keys())}")
        else:
            print("No inventory data found in database")
        # Combine the inventory data with session data
        combined_data = {
            "filtered_data": inventory_data,
            "session_data": session_data
        }
        # Return combined data as JSON
        return jsonify(combined_data)
    except Exception as e:
        # Catch any exceptions and return the error as JSON
        print(f"Error in invent_dashboard_function: {str(e)}")
        return jsonify({'error': str(e)})
