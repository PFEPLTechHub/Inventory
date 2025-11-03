-- Use the inventory_db database
USE inventory_db;

-- Create user_info table
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
);

-- Create managers_data table
CREATE TABLE IF NOT EXISTS managers_data (
    manager_index_id INT AUTO_INCREMENT PRIMARY KEY,
    ID VARCHAR(50) UNIQUE NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Password VARCHAR(100) NOT NULL,
    TypeOfAccount VARCHAR(50) NOT NULL,
    MailID VARCHAR(100),
    PhoneNo VARCHAR(20),
    Physical_location VARCHAR(200)
);

-- Create projects_managers table
CREATE TABLE IF NOT EXISTS projects_managers (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    Projects VARCHAR(100) NOT NULL,
    Address TEXT,
    GSTIN VARCHAR(50),
    STATE VARCHAR(100),
    State_Code VARCHAR(10),
    Manager INT
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    ProductID VARCHAR(50) PRIMARY KEY,
    Category VARCHAR(100),
    Name VARCHAR(200),
    Make VARCHAR(100),
    Model VARCHAR(100),
    ProductSerial VARCHAR(100),
    Project VARCHAR(100),
    Owner VARCHAR(100),
    `Condition` VARCHAR(50),
    Handover_Date DATE,
    empname VARCHAR(100),
    `set` VARCHAR(100)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    category_name VARCHAR(100) PRIMARY KEY
);

-- Create transaction_details table
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
);

-- Create transaction_product_details table
CREATE TABLE IF NOT EXISTS transaction_product_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Transaction_uid VARCHAR(50),
    ProductID VARCHAR(50),
    SenderImage VARCHAR(200),
    ReceiverImage VARCHAR(200),
    ItemStatus VARCHAR(50)
);

-- Create handover_data table
CREATE TABLE IF NOT EXISTS handover_data (
    FormID VARCHAR(50) PRIMARY KEY,
    Sender VARCHAR(100),
    Receiver VARCHAR(100),
    Project VARCHAR(100),
    Status VARCHAR(50),
    Date DATE
);

-- Create afterdelete table
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
    `Condition` VARCHAR(50),
    Handover_Date DATE,
    empname VARCHAR(100),
    Delete_Date DATETIME
);

-- Tables created successfully
-- Your existing data will remain intact
