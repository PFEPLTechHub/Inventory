

'''
global extracted_rows
extracted_rows = None

@app.route('/render_receiver')
def render_receiver():
    global extracted_rows
    form_id = request.args.get('formNo')  # Get the value from the URL query parameter
    if form_id:
        extracted_rows = extract_rows_from_excel(form_id)  # Call the function with the extracted form_id
        print("this is the extracted rows from render receiver", extracted_rows)
    else:
        return "Form ID not provided."

    return render_template('Modules/Main/Reciever/form_data.html')

'''

'''



def process_excel(file_path):
    try:
        # Load the Excel workbook
        wb = openpyxl.load_workbook(file_path)
        
        # Select the active worksheet
        ws = wb.active
        
        # Find the column index based on column names in the first row
        headers = [cell.value for cell in ws[1]]  # Assuming headers are in the first row
        serial_no_column_index = headers.index('Serial No') + 1  # Adding 1 to convert to 1-based indexing
        print("Serial No column index:", serial_no_column_index)
        
        # Get values from Serial_No column and convert to a list of strings
        serial_nos = [str(cell.value) for row in ws.iter_rows(min_row=2, min_col=serial_no_column_index, max_col=serial_no_column_index) for cell in row if cell.value is not None]
        print("Serial Nos from Excel:", serial_nos)
        
        # Correct the versions
        corrected_versions = correct_versions(serial_nos)
        print("Corrected versions:", corrected_versions)
        
        if corrected_versions is None:
            print("No corrected versions were generated. Exiting...")
            return
        
        # Write corrected values back to Serial_No column
        for i, corrected_version in enumerate(corrected_versions):
            ws.cell(row=i+2, column=serial_no_column_index, value=corrected_version)
        
        # Save the changes
        wb.save(file_path)
        print("Corrections saved to Excel.")
    
    except Exception as e:
        print("An error occurred:", e)


'''


'''
@app.route('/approve_receive_request', methods=['POST'])
def approve_receive_request():
    form_data = request.json  # Assuming the form data is sent as JSON
    print("This is the approve_receive_request form data",form_data)
    
    # Open handover_data.xlsx
    excel_file = "Excel/handover_data.xlsx"
    df = pd.read_excel(excel_file)

    # Check if there is any form data
    if form_data:
        product_ids = [item['ProductID'] for item in form_data]
        df = df[~df['ProductID'].isin(product_ids)]  # Remove rows with matching product IDs

        # Save the updated DataFrame back to the Excel file
        df.to_excel(excel_file, index=False)

    return "Data updated successfully."

'''

'''
def extract_rows_from_excel(serial_number, less_df):

    df = less_df
    print("this is the less df", less_df)
    print("this is the serial number we are trying to find in the df", serial_number)


    # Convert "Serial No" column to strings
    df["Serial"] = df["Serial"].astype(str)


    # Extract values from the Serial column
    serial_values = df["Serial"].tolist()
    
    # Correct versions
    corrected_serial_values = correct_versions(serial_values)
    
    # Update the Serial column with corrected values
    df["Serial"] = corrected_serial_values
    

    
    # Filter rows based on serial number
    filtered_df = df[df["Serial"].str.startswith(str(serial_number) + ".")]

    # Replace NaN values with "Nan"
    filtered_df.fillna("Nan", inplace=True)
    
    print("This is the filtered df", filtered_df)
    return filtered_df.to_dict(orient="records")
'''


'''




def extract_rows_first_filter(excel_file, column_name, value):
    try:
        df = pd.read_excel(excel_file)
    except FileNotFoundError:
        print("Excel file not found.")
        return None, None
    except Exception as e:
        print("An error occurred while loading the Excel file:", e)
        return None, None
    
    if column_name not in df.columns:
        print(f"Column '{column_name}' not found in the Excel file.")
        return None, None

    # Replace all NaN values in the DataFrame with 'NAN'
    df = df.fillna('nan')

    # Convert both the DataFrame values and the comparison value to lowercase
    df[column_name] = df[column_name].str.lower().str.strip()
    value = value.lower().strip()


    #print("this is the excel data", df)
    print("this column name", column_name)
    print("this is the value we are searching", value)

    filtered_df = df[df[column_name] == value]
    print("lets see this dataframe", filtered_df)
    # Count unique values in the 'FormID' column
    form_id_count = filtered_df['FormID'].nunique()
    
    return filtered_df, form_id_count

def correct_versions(versions):
    try:
        # Extracting major parts
        major_parts = [int(version.split('.')[0]) for version in versions]
        print("Extracted major parts:", major_parts)

        # Mapping major parts to consecutive digits starting from 1
        major_mapping = {}
        mapped_major_parts = []
        counter = 1
        for major in major_parts:
            if major not in major_mapping:
                major_mapping[major] = counter
                counter += 1
            mapped_major_parts.append(major_mapping[major])
        print("Mapped major parts:", mapped_major_parts)

        # Reconstructing the strings with mapped major parts
        mapped_versions = [f"{mapped_major}.{minor}" for mapped_major, minor in zip(mapped_major_parts, [version.split('.')[1] for version in versions])]
        print("Mapped versions:", mapped_versions)

        return mapped_versions
    except Exception as e:
        print("An error occurred in correcting versions:", e)
        return None
'''


'''
global extracted_rows_data
extracted_rows_data = None

@app.route('/get_list', methods=['GET'])
def get_list():

    global extracted_rows_data

    # Retrieve the text sent in the query parameter
    text_data = request.args.get('text', '')
    excel = "Excel/handover_data.xlsx"

    if text_data == "Approve Sender Form":
        column_name = "FromProject"
        project = session.get('login_row_data', {}).get('Project', 'Unknown')
        print("this is the project name value that we are trying to search",project)
        extracted_rows_data, form_id_count = extract_rows_first_filter(excel, column_name, project)
        print("This is the extracted rows data from the first filter",extracted_rows_data)
        return str(form_id_count)

    elif text_data == "Receiver Form":
        column_name = "ToPerson"
        project = session.get('login_row_data', {}).get('Name', 'Unknown')
        print("this is the project name value that we are trying to search",project)
        extracted_rows_data, form_id_count = extract_rows_first_filter(excel, column_name, project)
        print("This is the extracted rows data from the first filter",extracted_rows_data)
        return str(form_id_count)

    elif text_data == "Approve Receiver Form":
        column_name = "ToProject"
        project = session.get('login_row_data', {}).get('Project', 'Unknown')
        print("this is the project name value that we are trying to search",project)
        extracted_rows_data, form_id_count = extract_rows_first_filter(excel, column_name, project)
        print("This is the extracted rows data from the first filter",extracted_rows_data)
        return str(form_id_count)

    else:
        # Handle case when text doesn't match any condition
        total_rows = "Unknown text"

    return str(total_rows)

'''

'''


def extract_emails(sendername, receivername, m1project, m2project):
    # Read user_info from an Excel file into a DataFrame
    df = pd.read_excel('Excel/user_info.xlsx')
    
    # Initialize email variables
    e1mail = None
    e2mail = None
    m1mail = None
    m2mail = None
    
    # Extract email for sender
    sender_row = df[df['Name'] == sendername]
    if not sender_row.empty:
        e1mail = sender_row['MailID'].values[0]
    
    # Extract email for receiver
    receiver_row = df[df['Name'] == receivername]
    if not receiver_row.empty:
        e2mail = receiver_row['MailID'].values[0]
    
    # Extract email for m1project
    m1project_row = df[df['Project'] == m1project]
    if not m1project_row.empty:
        m1mail = m1project_row['MailID'].values[0]
    
    # Extract email for m2project
    m2project_row = df[df['Project'] == m2project]
    if not m2project_row.empty:
        m2mail = m2project_row['MailID'].values[0]
    
    print('these are the mail ids for e1 e2 m1 m2', e1mail, e2mail, m1mail, m2mail)
    return e1mail, e2mail, m1mail, m2mail



import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_address, subject, body, from_address='shaikhfahad687@gmail.com', smtp_server='smtp.gmail.com', smtp_port=465, login='shaikhfahad687@gmail.com', password='abtqssqpynefigyw'):
    msg = MIMEMultipart()
    msg['From'] = from_address
    msg['To'] = to_address
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(login, password)
        server.sendmail(from_address, to_address, msg.as_string())
        server.quit()
        print(f"Email sent to {to_address}")
    except Exception as e:
        print(f"Failed to send email to {to_address}: {e}")

def email(stage, formno, ewaybill, sender, receiver, source, destination, initiationdate, e1mail, e2mail, m1mail, m2mail):
    # Define the messages for each stage
    if stage == 1:
        e1_message = "You have initiated a transaction."
        m1_message = "A transaction has been initiated, please approve it."
        e2_message = m2_message = None
    elif stage == 2:
        e1_message = "Approval has been given to send the items."
        e2_message = "A transaction to your name has been initiated."
        m1_message = "You have approved a transaction to send."
        m2_message = "A transaction to your project has been initiated."
    elif stage == 3:
        e1_message = "The transaction goods have reached the destination."
        e2_message = "Mail for receive approval has been sent."
        m1_message = "The transaction goods have reached the destination."
        m2_message = "A transaction for receiving goods on your project is pending, please approve."
    elif stage == 4:
        e1_message = m1_message = e2_message = m2_message = "Transaction has been completed successfully."
    else:
        raise ValueError("Invalid stage value")

    # Common email body details
    email_body = f"""
    Form No: {formno}
    Ewaybill No: {ewaybill}
    Sender: {sender}
    Receiver: {receiver}
    Source: {source}
    Destination: {destination}
    Initiation Date: {initiationdate}
    """

    # Send emails with respective messages
    if e1mail and e1_message:
        send_email(e1mail, "Transaction Update", f"{e1_message}\n\n{email_body}")
    if e2mail and e2_message:
        send_email(e2mail, "Transaction Update", f"{e2_message}\n\n{email_body}")
    if m1mail and m1_message:
        send_email(m1mail, "Transaction Update", f"{m1_message}\n\n{email_body}")
    if m2mail and m2_message:
        send_email(m2mail, "Transaction Update", f"{m2_message}\n\n{email_body}")

# Example usage:
# email(stage, formno, ewaybill, sender, receiver, source, destination, initiationdate, e1mail, e2mail, m1mail, m2mail)

'''






'''
def send_email(message_content, form_no, eway_bill_no=None,from_person=None,to_person=None,from_project =None ,to_project =None ):

    print("This is the email From Person:", from_person)
    print("This is the email To Person:", to_person)
    print("This is the email From Project:", from_project)
    print("This is the email To Project:", to_project)

    # Sender and receiver email addresses
    sender_email = "shaikhfahad687@gmail.com"  # Update with your Gmail address
    receiver_email = "shaikhfahad687@gmail.com"  # Update with the receiver's email address

    try:
        # Gmail SMTP server details
        smtp_server = "smtp.gmail.com"
        smtp_port = 587  # Port for TLS encryption

        # Login credentials (use app password)
        email_password = "rgbbdlhpyleheico"  # Update with your Gmail app password

        # Establish a secure connection with the SMTP server
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            # Login to the SMTP server
            server.login(sender_email, email_password)
            
            # Create a multipart message
            message = MIMEMultipart()
            message["From"] = sender_email
            message["To"] = receiver_email
            
            if message_content == "Send Form":
                message["Subject"] = "Handover Transaction details"
                body_message = f"I want to send items, The excel sheet of the eway bill is attached below. Please generate the eway bill and approve this form. The form details are as follows:\n\nForm no: {form_no}\nFrom Project: {from_project}\nTo Project: {to_project}\nFrom Person: {from_person}\nTo Person: {to_person}"                
                # Add body to email
                message.attach(MIMEText(body_message, "plain"))
                
                # Get the current working directory
                current_directory = os.getcwd()
                # Assuming the Excel sheet is in the same directory, change the filename if it's different
                excel_file_path = os.path.join(current_directory, "Excel/eway_bill.xlsx")

                # Open the Excel file in binary mode
                with open(excel_file_path, "rb") as attachment:
                    # Add Excel file as application/octet-stream
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(attachment.read())

                # Encode file in ASCII characters to send by email    
                encoders.encode_base64(part)

                # Add header as key/value pair to attachment part
                part.add_header("Content-Disposition", f"attachment; filename= {os.path.basename(excel_file_path)}")

                # Add attachment to message
                message.attach(part)
                
            elif message_content == "Receive Form":
                message["Subject"] = "Receive Form details"
                body_message = f"I have received the items, need your approval to proceed with using them, please approve this form. The form details are as follows:\n\nForm no: {form_no}\nEway Bill no: {eway_bill_no}\nFrom Project: {from_project}\nTo Project: {to_project}\nFrom Person: {from_person}\nTo Person: {to_person}"
                
                # Add body to email
                message.attach(MIMEText(body_message, "plain"))
                
            elif message_content == "Send Approval Form":
                message["Subject"] = "Send Approval Form details"
                body_message = f"I have granted permission to transfer items. The form details are as follows:\n\nForm no: {form_no}\nEway Bill no: {eway_bill_no}\nFrom Project: {from_project}\nTo Project: {to_project}\nFrom Person: {from_person}\nTo Person: {to_person}"
                
                # Add body to email
                message.attach(MIMEText(body_message, "plain"))
                
            elif message_content == "Receive Approval Form":
                message["Subject"] = "Receive Approval Form details"
                body_message = f"I have granted permission to accept the items received. The form details are as follows:\n\nForm no: {form_no}\nEway Bill no: {eway_bill_no}\nFrom Project: {from_project}\nTo Project: {to_project}\nFrom Person: {from_person}\nTo Person: {to_person}"

                
                # Add body to email
                message.attach(MIMEText(body_message, "plain"))

            # Convert the message to string
            str_message = message.as_string()
            
            # Send email
            server.sendmail(sender_email, receiver_email, str_message)
    except Exception as e:
        print(f"An error occurred: {e}")

'''


