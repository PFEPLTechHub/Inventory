import mysql.connector
from mysql.connector import pooling
import time

# Initialize the connection pool
def create_connection_pool():
    dbconfig = {
        "host": "localhost",
        "user": "root",
        "password": "root",
        "database": "inventory_db",
        "pool_name": "erp_pool",
        "pool_size": 10,
        "connection_timeout": 10,  # 10 seconds timeout for establishing connection
        "buffered": True
    }
    return mysql.connector.pooling.MySQLConnectionPool(**dbconfig)

# Create the global pool
db_pool = create_connection_pool()

# Variables to track the pool usage
pool_active_connections = 0
pool_free_connections = db_pool.pool_size

# Function to log pool status
def log_pool_status():
    global pool_active_connections, pool_free_connections
    # print(f"Connection Pool Status: Total Pool Size = {db_pool.pool_size}, Active Connections = {pool_active_connections}, Free Connections = {pool_free_connections}")

# Function to execute queries with connection auto-close and detailed logging

def execute_query(query, params=None, commit=False, return_lastrowid=False):
    global pool_active_connections, pool_free_connections
    result = []
    connection = None
    lastrowid = None
    try:
        # Log the pool status before getting the connection
        log_pool_status()
        
        # Using with statement for connection management
        connection = db_pool.get_connection()

        # Increment active connections count
        pool_active_connections += 1
        pool_free_connections -= 1

        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(query, params)
            
            # If it's a SELECT statement, fetch the result
            if cursor.description:
                result = cursor.fetchall()
            
            # If commit is True, commit the transaction (for INSERT, UPDATE, DELETE)
            if commit:
                connection.commit()
                # Capture lastrowid after insert
                lastrowid = cursor.lastrowid

    except mysql.connector.pooling.PoolError as pool_err:
        print(f"PoolError: {pool_err} - Connection pool exhausted or connection error.")
        raise
    
    except mysql.connector.errors.ProgrammingError as prog_err:
        print(f"ProgrammingError: {prog_err} - Likely a query syntax error.")
        raise
    
    except mysql.connector.errors.OperationalError as op_err:
        print(f"OperationalError: {op_err} - There was an issue with the connection or the server.")
        raise
    
    except mysql.connector.Error as err:
        print(f"MySQL error: {err} - General MySQL error occurred.")
        raise
    
    except Exception as e:
        print(f"Unexpected error during query execution: {e}")
        raise
    
    finally:
        # Check if connection is still open and close it if necessary
        if connection and connection.is_connected():
            connection.close()
            pool_active_connections -= 1
            pool_free_connections += 1
        log_pool_status()
    
    if return_lastrowid:
        return lastrowid
    return result




# def execute_query(query, params=None, commit=False):
#     global pool_active_connections, pool_free_connections
#     result = []
#     connection = None
#     try:
#         # Log the pool status before getting the connection
#         log_pool_status()
        
#         # Using with statement for connection management
#         # print("Attempting to get a connection from the pool...")
#         connection = db_pool.get_connection()

#         # Increment active connections count
#         pool_active_connections += 1
#         pool_free_connections -= 1
#         # print(f"Connection successfully established. Connection ID: {connection.connection_id}")

#         with connection.cursor(dictionary=True) as cursor:
#             # print(f"Cursor successfully created.")

#             # Executing the query
#             # print(f"Executing query: {query}")
#             cursor.execute(query, params)
            
#             # If it's a SELECT statement, fetch the result
#             if cursor.description:
#                 # print("Fetching results from the query...")
#                 result = cursor.fetchall()
#                 # print(f"Fetched {len(result)} rows.")
            
#             # If commit is True, commit the transaction (for INSERT, UPDATE, DELETE)
#             if commit:
#                 # print("Committing the transaction...")
#                 connection.commit()
                
#                 # print("Transaction committed.")
    
#     except mysql.connector.pooling.PoolError as pool_err:
#         print(f"PoolError: {pool_err} - Connection pool exhausted or connection error.")
    
#     except mysql.connector.errors.ProgrammingError as prog_err:
#         print(f"ProgrammingError: {prog_err} - Likely a query syntax error.")
    
#     except mysql.connector.errors.OperationalError as op_err:
#         print(f"OperationalError: {op_err} - There was an issue with the connection or the server.")
    
#     except mysql.connector.Error as err:
#         print(f"MySQL error: {err} - General MySQL error occurred.")
    
#     except Exception as e:
#         print(f"Unexpected error during query execution: {e}")
    
#     finally:
#         # Check if connection is still open and close it if necessary
#         if connection and connection.is_connected():
#             # print(f"Closing connection. Connection ID: {connection.connection_id}")
#             connection.close()
#             # Decrement active connections count and increment free connections
#             pool_active_connections -= 1
#             pool_free_connections += 1
#             # print("Connection closed.")
        
#         # Log the pool status after query execution
#         log_pool_status()
    
#     return result

# Example usage:
# result = execute_query("SELECT * FROM handover_data WHERE FormID = %s", ('2d413bca',))
