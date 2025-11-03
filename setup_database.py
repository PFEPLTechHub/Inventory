import mysql.connector
from mysql.connector import Error

def create_database_and_tables():
    try:
        # Connect to MySQL server without specifying database
        connection = mysql.connector.connect(
            host='localhost',
            user='u221987201_Shayan123',
            password='ShayanPFEPL@123'
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # Create database
            cursor.execute("CREATE DATABASE IF NOT EXISTS inventory_db")
            print("✅ Database 'inventory_db' created successfully")
            
            # Use the database
            cursor.execute("USE inventory_db")
            
            # Create tables
            tables = [
                """
                CREATE TABLE IF NOT EXISTS user_info (
                    userinfo_uid INT AUTO_INCREMENT PRIMARY KEY,
                    ID VARCHAR(50) UNIQUE NOT NULL,
                    Name VARCHAR(100) NOT NULL,
                    Password VARCHAR(100) NOT NULL,
                    TypeOfAccount VARCHAR(50) NOT NULL,
                    project_id INT,
                    MailID VARCHAR(100),
                    PhoneNo VARCHAR(20),
                    Project VARCHAR(100)
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS managers_data (
                    manager_index_id INT AUTO_INCREMENT PRIMARY KEY,
                    ID VARCHAR(50) UNIQUE NOT NULL,
                    Name VARCHAR(100) NOT NULL,
                    Password VARCHAR(100) NOT NULL,
                    TypeOfAccount VARCHAR(50) NOT NULL,
                    MailID VARCHAR(100),
                    PhoneNo VARCHAR(20),
                    Physical_location VARCHAR(200)
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS projects_managers (
                    project_id INT AUTO_INCREMENT PRIMARY KEY,
                    Projects VARCHAR(100) NOT NULL,
                    Address TEXT,
                    GSTIN VARCHAR(50),
                    STATE VARCHAR(100),
                    State_Code VARCHAR(10),
                    Manager INT
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS inventory (
                    ProductID VARCHAR(50) PRIMARY KEY,
                    Category VARCHAR(100),
                    Name VARCHAR(200),
                    Make VARCHAR(100),
                    Model VARCHAR(100),
                    ProductSerial VARCHAR(100),
                    Project VARCHAR(100),
                    Owner VARCHAR(100),
                    Condition VARCHAR(50),
                    Handover_Date DATE,
                    empname VARCHAR(100),
                    set VARCHAR(100)
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS categories (
                    category_name VARCHAR(100) PRIMARY KEY
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS transaction_details (
                    Transaction_uid VARCHAR(50) PRIMARY KEY,
                    EwayBillNo VARCHAR(100),
                    Source INT,
                    Destination INT,
                    Sender_uid INT,
                    Receiver_uid INT,
                    InitiationDate DATETIME,
                    Status VARCHAR(50),
                    ApprovalToSend INT DEFAULT 0,
                    ApprovalToReceive INT DEFAULT 0,
                    Isreceive INT DEFAULT 0
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS transaction_product_details (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    Transaction_uid VARCHAR(50),
                    ProductID VARCHAR(50),
                    SenderImage VARCHAR(200),
                    ReceiverImage VARCHAR(200),
                    ItemStatus VARCHAR(50)
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS handover_data (
                    FormID VARCHAR(50) PRIMARY KEY,
                    Sender VARCHAR(100),
                    Receiver VARCHAR(100),
                    Project VARCHAR(100),
                    Status VARCHAR(50),
                    Date DATE
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS afterdelete (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ProductID VARCHAR(50),
                    Category VARCHAR(100),
                    Name VARCHAR(200),
                    Make VARCHAR(100),
                    Model VARCHAR(100),
                    ProductSerial VARCHAR(100),
                    Project VARCHAR(100),
                    Owner VARCHAR(100),
                    Condition VARCHAR(50),
                    Handover_Date DATE,
                    empname VARCHAR(100),
                    Delete_Date DATETIME
                )
                """
            ]
            
            for i, table_sql in enumerate(tables, 1):
                cursor.execute(table_sql)
                print(f"✅ Table {i} created successfully")
            
            # Insert sample data
            print("\n📝 Inserting sample data...")
            
            # Insert sample categories
            cursor.execute("""
                INSERT IGNORE INTO categories (category_name) VALUES 
                ('Electronics'), ('Furniture'), ('Office Equipment'), ('Tools')
            """)
            
            # Insert sample project
            cursor.execute("""
                INSERT IGNORE INTO projects_managers (Projects, Address, GSTIN, STATE, State_Code, Manager) VALUES 
                ('Sample Project', '123 Main St', 'GST123456', 'Sample State', '01', 1)
            """)
            
            # Insert sample manager
            cursor.execute("""
                INSERT IGNORE INTO managers_data (ID, Name, Password, TypeOfAccount, MailID, PhoneNo) VALUES 
                ('MGR001', 'John Manager', 'MGR001', 'Manager', 'john@company.com', '1234567890')
            """)
            
            # Insert sample user
            cursor.execute("""
                INSERT IGNORE INTO user_info (ID, Name, Password, TypeOfAccount, project_id, MailID, PhoneNo, Project) VALUES 
                ('EMP001', 'Jane Employee', 'EMP001', 'Employee', 1, 'jane@company.com', '0987654321', '1')
            """)
            
            # Insert sample inventory items
            cursor.execute("""
                INSERT IGNORE INTO inventory (ProductID, Category, Name, Make, Model, ProductSerial, Project, Owner, Condition, Handover_Date, empname) VALUES 
                ('PROD001', 'Electronics', 'Laptop', 'Dell', 'Inspiron 15', 'DL123456', 'Sample Project', 'Jane Employee', 'Good', '2024-01-15', 'Jane Employee'),
                ('PROD002', 'Electronics', 'Monitor', 'Samsung', '24 inch', 'SM789012', 'Sample Project', 'Jane Employee', 'Excellent', '2024-01-20', 'Jane Employee'),
                ('PROD003', 'Furniture', 'Office Chair', 'IKEA', 'Ergonomic', 'IK345678', 'Sample Project', 'Jane Employee', 'Good', '2024-02-01', 'Jane Employee')
            """)
            
            connection.commit()
            print("✅ Sample data inserted successfully!")
            print("\n🎉 Database setup completed successfully!")
            print("You can now use the application with sample data.")
            
    except Error as e:
        print(f"❌ Error: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 MySQL connection closed")

if __name__ == "__main__":
    create_database_and_tables()
