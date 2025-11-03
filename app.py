from flask import Flask, request, render_template, jsonify
import subprocess
import json
import pandas as pd
from flask_cors import CORS  # Import CORS
from flask_cors import cross_origin
from itertools import count
import re
import os
import openpyxl
from datetime import datetime
from openpyxl import Workbook
from openpyxl import load_workbook
from flask import Flask, request, redirect, url_for
from bs4 import BeautifulSoup
from flask import session
from datetime import date
from dateutil import tz
from datetime import datetime as dt, timezone
import datetime
import datetime
from datetime import datetime
from flask import Flask, jsonify
import pandas as pd
from flask import Flask, request, render_template, jsonify
from flask import Flask, request, jsonify
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from flask import Flask, request, jsonify
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from flask import Flask, jsonify, request
import pandas as pd
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, render_template_string
import pandas as pd
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from flask import request
import mysql.connector
from PIL import Image
from PIL.ExifTags import TAGS
import pillow_heif  
from io import BytesIO
import shutil
from flask import Flask, jsonify, request
from datetime import datetime
from static.functions import handover
from static.functions import approvaltable
from static.functions.route_callings import page_routes
from static.functions import common_functions
from static.functions import approvesend
from static.functions import approvereceive
from static.functions import transfer_progress
from static.functions import receive_items
from static.functions import transaction_history
from static.functions import Product_history
from static.functions import inventory
from static.functions import adddeleteitem
from static.functions import add_category

from static.functions.db_connections_functions import execute_query
import glob


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
cors = CORS(app, resources={r"/handover_form": {"origins": "*"}})  # Enable CORS for /handover_form route
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'


#----------------------------------------------------------------------------------------------------------------------------------------------
#                                                   Route Calling

app.register_blueprint(page_routes)
@app.route('/manager')
def manager():
    return render_template('manager.html')

@app.route('/employee')
def employee():
    return render_template('employee.html')

    
@app.route('/get_username')
def get_username():

    name = session.get('login_row_data', {}).get('Name')

    return jsonify({'username': name})

@app.route('/image_carousel')
def image_carousel():
    return render_template('image_carousel.html')



#-----------------------------------------------------------------------------------------------------------------------------------------------
#                                                    Login Page

@app.route('/login', methods=['POST'])
def login():
    try:
        username = request.form['username']
        password = request.form['password']
        print(f"[DEBUG] Received credentials -> ID: {username}, Password: {password}")

        # Step 1: Check if user exists in user_info
        user_query = """
            SELECT * FROM user_info
            WHERE ID = %s AND Password = %s
        """
        print("[DEBUG] Checking user_info table...")
        user_result = execute_query(user_query, (username, password))
        print(f"[DEBUG] user_info result: {user_result}")

        if user_result:
            session['login_row_data'] = user_result[0]
            return jsonify({"status": "success", "message": "Login matched"}), 200

        # Step 2: Check if user is a manager
        print("[DEBUG] Checking managers_data table...")
        manager_query = """
            SELECT * FROM managers_data
            WHERE ID = %s AND Password = %s
        """
        manager_result = execute_query(manager_query, (username, password))
        print(f"[DEBUG] managers_data result: {manager_result}")

        if manager_result:
            manager_data = manager_result[0]
            manager_index_id = manager_data["manager_index_id"]
            manager_name = manager_data["Name"]
            print(f"[DEBUG] Manager Index ID: {manager_index_id}, Name: {manager_name}")

            # Step 3: Fetch projects from projects_managers using manager_index_id
            project_query = """
                SELECT project_id FROM projects_managers WHERE Manager = %s
            """
            print(f"[DEBUG] Fetching projects for manager_index_id = {manager_index_id}...")
            project_result = execute_query(project_query, (manager_index_id,))
            print(f"[DEBUG] Projects query result: {project_result}")

            # Step 4: Format and store in session
            project_ids = [row["project_id"] for row in project_result] if project_result else []
            project_string = ', '.join(map(str, project_ids))  # Convert IDs to strings for storage
            print(f"[DEBUG] Final Project List: {project_string}")

            session['login_row_data'] = manager_data
            session['login_row_data']["Project"] = project_string  # Store project IDs as a string
            print(f"[DEBUG] Final Session Data: {session['login_row_data']}")

            return jsonify({"status": "success", "message": "Login matched"}), 200

        print("[DEBUG] No matching user or manager found.")
        return jsonify({"status": "fail", "message": "Account not found. Please try again or register."}), 404

    except Exception as e:
        print(f"[DEBUG] Login error: {str(e)}")
        return jsonify({"status": "error", "message": "An error occurred. Please try again later."}), 500



@app.route('/get_session_data', methods=['GET'])
def get_session_data():
    print("[DEBUG] Checking session for login_row_data...")

    if 'login_row_data' not in session:
        return jsonify({"error": "User data not found in session"}), 404

    login_data = session['login_row_data'].copy()  # Copy to avoid mutating session

    # For managers: multiple projects (comma-separated IDs)
    if 'Project' in login_data and login_data['Project']:
        project_ids = [pid.strip() for pid in login_data['Project'].split(',') if pid.strip().isdigit()]
        if project_ids:
            placeholders = ','.join(['%s'] * len(project_ids))
            query = f"SELECT project_id, Projects FROM projects_managers WHERE project_id IN ({placeholders})"
            results = execute_query(query, tuple(project_ids))
            project_names = [row['Projects'] for row in results]
            login_data['ProjectNames'] = project_names
        else:
            login_data['ProjectNames'] = []
    # For users: single project_id
    elif 'project_id' in login_data and login_data['project_id']:
        query = "SELECT Projects FROM projects_managers WHERE project_id = %s"
        results = execute_query(query, (login_data['project_id'],))
        project_name = results[0]['Projects'] if results else ""
        login_data['ProjectNames'] = [project_name] if project_name else []
    else:
        login_data['ProjectNames'] = []

    return jsonify(login_data)



#------------------------------------------------------------------------------------------------------------------------------------------
#                                                 Send Form(handover)

@app.route('/cart_items')
def cart_items():
    # Get the user ID from session data
    user_id = session.get('login_row_data', {}).get('ID')

    # Get the project(s) from session data
    session_data = session.get('login_row_data', {})
    projects     = session_data.get('Project', '').split(', ')

    # Fetch cart items using user_id instead of name
    data = handover.cart_items_function(user_id, projects, session_data)

    return jsonify(combined_data=data)


@app.route('/send_approval_request', methods=['POST'])
def send_approval_request():
    try:
        form_data = request.json
        result = handover.process_form_data(form_data)

        if not result or 'transaction_uid' not in result:
            raise Exception("Handover failed. No transaction ID returned.")

        transaction_uid = result['transaction_uid']
        transaction_type = result.get('transaction_type', 'send')
        image_mappings = result.get('image_mappings', {})

        # Create transaction folder
        final_folder = os.path.join("static", "images", str(transaction_uid))
        os.makedirs(final_folder, exist_ok=True)

        # Move & rename images
        for product_id, img_info in image_mappings.items():
            ext = img_info['ext']
            old_path = os.path.join("static", "images", "temp", img_info['name'])
            new_name = f"{product_id}_{transaction_type}.{ext}"
            new_path = os.path.join(final_folder, new_name)
            
            # Add validation status flag to the image info
            validation_status = "valid" if img_info.get('valid', False) else "invalid"
            print(f"Image for product {product_id} is {validation_status}")

            if os.path.exists(old_path):
                shutil.move(old_path, new_path)
                print(f"Moved: {old_path} → {new_path}")
            else:
                print(f"Warning: {old_path} not found.")

        return jsonify({'status': 'success', 'message': 'Handover has been initiated successfully.'})

    except Exception as e:
        print(f"Error during handover: {e}")
        return jsonify({'status': 'error', 'message': 'Handover initiation has failed, please try again'}), 500



@app.route('/approval_table', methods=['GET'])
def approval_table():
    # Get the project string from session
    project_str = session.get('login_row_data', {}).get('Project', '')
    
    # Split and filter out empty strings
    projects = [p.strip() for p in project_str.split(',') if p.strip()]
    
    session_data = session.get('login_row_data', {})
    json_data = approvaltable.approval_table_function(projects, session_data)
    return json_data



@app.route('/approve_send_request', methods=['POST'])
def approve_send_request():
    form_data = request.json  # Assuming the form data is sent as JSON
    print("This is the approve_send_request form data", form_data)
    response = approvesend.approve_send_request_function( form_data)
    print("this is the response we are sending",response)
    return response



@app.route('/disapprove_send_request', methods=['POST'])
def disapprove_send_request():
    form_data = request.json  # Assuming the form data is sent as JSON
    print("This is the disapprove_send_request form data", form_data)
    approvesend.disapprove_send_request_function( form_data)                     
    return jsonify({'message': 'Data updated successfully.'})

#----------------------------------------------------------------------------------------------------------------------------------------
#                                                   Receive Form


@app.route('/approve_receive_request', methods=['POST'])
def approve_receive_request():

    data = request.json  # Assuming the data sent in the request body is JSON
    
    approvereceive.approve_receive_request_function(data)
    return "Approval has been successfully given, the email is sent, the sender may proceed to send the items"


@app.route('/disapprove_receive_request', methods=['POST'])
def disapprove_receive_request():

    data = request.json  # Assuming the data sent in the request body is JSON
    
    approvereceive.disapprove_receive_request_function( data)
    return "Approval has been successfully given, the email is sent, the sender may proceed to send the items"


@app.route('/receive_items_table_data', methods=['GET'])
def recieve_items_table_data():

    name = session.get('login_row_data', {}).get('Name')
    print(f"[DEBUG] receive_items_table_data called with name: {name}")
    print(f"[DEBUG] Full session data: {session.get('login_row_data', {})}")

    data = receive_items.receive_items_table_data_function(name,session.get('login_row_data', {}))

    #print('this is the data before returning for receive items table data')
    return data


@app.route('/receive_approval_request', methods=['POST'])
def receive_approval_request():
    try:
        form_data = request.json  # This is the full form object
        print("This is the receive_approval_request form data", form_data)

        # Extract transaction_uid and image mappings
        transaction_uid = None
        image_mappings = {}
        transaction_type = 'receive'

        for item in form_data:
            if not transaction_uid and 'Transaction_uid' in item:
                transaction_uid = item['Transaction_uid']
            if 'ProductID' in item and 'ReceiverImage' in item:
                product_id = item['ProductID']
                ext = item['ReceiverImage']
                temp_filename = f"{product_id}.{ext}"
                image_mappings[product_id] = {'ext': ext, 'name': temp_filename}

        if not transaction_uid:
            raise Exception("No Transaction_uid found in the form data.")

        # Step 1: Insert data first
        receive_items.receive_approval_request_function(form_data)
        print("Data insertion successful.")

        # Step 2: Move images only after successful insertion
        final_folder = os.path.join("static", "images", str(transaction_uid))
        if not os.path.exists(final_folder):
            raise Exception(f"Transaction folder {final_folder} does not exist.")

        for product_id, img_info in image_mappings.items():
            ext = img_info['ext']
            old_path = os.path.join("static", "images", "temp", img_info['name'])
            new_name = f"{product_id}_{transaction_type}.{ext}"
            new_path = os.path.join(final_folder, new_name)

            if os.path.exists(old_path):
                shutil.move(old_path, new_path)
                print(f"Moved: {old_path} → {new_path}")
            else:
                print(f"Warning: {old_path} not found.")

        return "Mail for approval of receiving item is sent, you may contact your manager to approve it."

    except Exception as e:
        print(f"Error during receiver-side handover: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500



@app.route('/disapprove_receive_approval_request', methods=['POST'])
def disapprove_receive_approval_request():
    form_data = request.json  # Assuming the form data is sent as JSON
    print(" diss form_data",form_data)
    print("This is the receive_approval_request form data", form_data)
    receive_items.disapprove_receive_approval_request_function(form_data)
    return "Mail for approval of receiving item is sent, you may contact your manager to approve it."

#----------------------------------------------------------------------------------------------------------------------------------------
#                                       Image-validation /(Send and Receiver form)   
       
TEMP_FOLDER = os.path.join("static", "images", "temp")
os.makedirs(TEMP_FOLDER, exist_ok=True)  # Ensure temp folder exists

# Register HEIC opener
pillow_heif.register_heif_opener()

# Function to extract EXIF data
def get_exif_data(image):
    try:
        print("Attempting to extract EXIF data...") 
        exif_data = image._getexif()
        if exif_data is None:
            print("No EXIF data found.")
            return None

        exif_dict = {TAGS.get(tag, tag): value for tag, value in exif_data.items()}
        print(f"EXIF Data: {exif_dict}")
        return exif_dict
    except Exception as e:
        print(f"Error extracting EXIF: {e}")
        return None

# Function to detect potential tampering
def check_for_tampering(exif_data):
    if not exif_data:
        print("No EXIF data, marking as tampered.") 
        return True  

    date_time_original = exif_data.get('DateTimeOriginal')
    date_time = exif_data.get('DateTime')
    date_time_digitized = exif_data.get('DateTimeDigitized')

    if not date_time_original:
        print("No DateTimeOriginal, marking as tampered.") 
        return True  

    if date_time and date_time != date_time_original:
        print("DateTimeDigitized mismatch, marking as tampered.")
        return True  

    if date_time_digitized and date_time_digitized != date_time_original:
        return True  

    make = exif_data.get('Make')
    software = exif_data.get('Software')

    if make and 'Apple' in make:
        print("Make is Apple, considered valid.")
        return False  

    if software:
        print(f"Software found: {software}, marking as tampered.")
        return True  

    return False

# Function to save and compress the image in the temp folder
def save_image(file, product_id):
    """Save and compress the image in the temp folder, replacing old image if needed."""
    ext = file.filename.rsplit('.', 1)[-1].lower()  # Get file extension
    
    # Always save as jpg for better compression (convert from heic, png, etc.)
    final_ext = 'jpg'
    filename = f"{product_id}.{final_ext}"
    file_path = os.path.join(TEMP_FOLDER, filename)

    # Delete old image if it exists
    for old_file in os.listdir(TEMP_FOLDER):
        if old_file.startswith(product_id + "."):
            os.remove(os.path.join(TEMP_FOLDER, old_file))
            print(f"Deleted old image: {old_file}")
            break  # Ensure only one file is deleted

    # Open and compress the image
    file.seek(0)  # Reset file pointer before reading
    try:
        image = Image.open(file)
        
        # Convert to RGB if needed (for PNG with transparency or HEIC)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create a white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize image if it's too large (max 1920px on longest side)
        max_dimension = 1920
        if max(image.size) > max_dimension:
            ratio = max_dimension / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            print(f"Resized image from {file.filename} to {new_size}")
        
        # Save with compression (quality 85 is a good balance)
        image.save(file_path, 'JPEG', quality=85, optimize=True)
        print(f"Saved and compressed image: {filename}")
        
    except Exception as e:
        print(f"Error compressing image: {e}")
        # Fallback: save without compression
        file.seek(0)
        file.save(file_path)
        print(f"Saved image without compression: {filename}")
    
    return filename, final_ext

# `/validate_image` API (Now also saves image)
# @app.route("/validate_image", methods=["POST"])
# def validate_image():
#     if "file" not in request.files:
#         return jsonify({"status": "error", "message": "No file part"})

#     file = request.files["file"]
#     product_id = request.form.get("product_id", "")  # Get product ID from frontend

#     if file.filename == "":
#         return jsonify({"status": "error", "message": "No selected file"})

#     file_ext = os.path.splitext(file.filename)[1].lower()  # Get file extension

#     # Save the image in the temp folder regardless of validation status
#     saved_filename, saved_ext = save_image(file, product_id)
#     print(f"Image saved to temp folder: {saved_filename}")

#     # Read image into memory for validation
#     try:
#         # Reopen the saved file for validation
#         image_path = os.path.join(TEMP_FOLDER, saved_filename)
#         image = Image.open(image_path)
#         print("Image opened successfully for validation.")
#     except Exception as e:
#         print(f"Error opening image for validation: {e}")
#         # Return error but with the saved file information
#         return jsonify({
#             "status": "error", 
#             "message": f"Invalid image file: {e}",
#             "ext": saved_ext,
#             "name": saved_filename,
#             "is_valid": False
#         })

#     # Extract EXIF metadata
#     exif_data = get_exif_data(image)
#     is_valid = True

#     # Check for EXIF data
#     if not exif_data:
#         print("EXIF data extraction failed.")
#         is_valid = False
#         validation_message = "No EXIF data found! Validation failed."
#     # Check for tampering if EXIF exists
#     elif check_for_tampering(exif_data):
#         print("Tampering detected.") 
#         is_valid = False
#         validation_message = "Image appears to be tampered with or edited!"
#     else:
#         validation_message = "Image validation successful"

#     # Return response with validation status and file info
#     return jsonify({
#         "status": "success" if is_valid else "error",
#         "message": validation_message,
#         "ext": saved_ext,
#         "name": saved_filename,
#         "is_valid": is_valid
#     })



@app.route("/validate_image", methods=["POST"])
def validate_image():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file part"})

    file = request.files["file"]
    product_id = request.form.get("product_id", "")  # Get product ID from frontend

    if file.filename == "":
        return jsonify({"status": "error", "message": "No selected file"})

    # Save the image in the temp folder regardless of validation status
    saved_filename, saved_ext = save_image(file, product_id)
    print(f"Image saved to temp folder: {saved_filename}")

    # Read image into memory for validation
    try:
        image_path = os.path.join(TEMP_FOLDER, saved_filename)
        image = Image.open(image_path)
        print("Image opened successfully for validation.")
    except Exception as e:
        print(f"Error opening image for validation: {e}")
        return jsonify({
            "status": "error",
            "message": f"Invalid image file: {e}",
            "ext": saved_ext,
            "name": saved_filename,
            "is_valid": False
        })

    # SIMPLIFIED VALIDATION - All restrictions commented out
    # Any image format that PIL can read will be accepted
    # No EXIF data required - images without metadata are fine
    # No tampering checks - edited images are accepted
    # All devices treated equally - no special handling for Apple devices
    # Simple validation - just checks if the file can be opened as an image
    
    # Extract EXIF metadata (commented out - no longer used for validation)
    # exif_data = get_exif_data(image)
    is_valid = True
    validation_message = "Image validation successful - all restrictions removed"

    # Skip validation for Apple/iPhone images (commented out - no special handling)
    # make = exif_data.get('Make') if exif_data else None
    # if make and 'Apple' in make:
    #     print("Apple image detected, skipping validation.")
    #     is_valid = True
    #     validation_message = "Apple image accepted without validation"
    # else:
    #     # Existing validation for other images (commented out)
    #     if not exif_data:
    #         print("EXIF data extraction failed.")
    #         is_valid = False
    #         validation_message = "No EXIF data found! Validation failed."
    #     elif check_for_tampering(exif_data):
    #         print("Tampering detected.")
    #         is_valid = False
    #         validation_message = "Image appears to be tampered with or edited!"

    # All images are now accepted as long as they can be opened by PIL
    print("Image accepted - no restrictions applied")
    is_valid = True
    validation_message = "Image accepted - all validation restrictions removed"

    return jsonify({
        "status": "success",  # Always success now
        "message": validation_message,
        "ext": saved_ext,
        "name": saved_filename,
        "is_valid": True  # Always true now
    })


#-------------------------------------------------------------------------------------------------------------------------------------------------------
#                                             Image Carousel
# send Items images
@app.route('/get_product_images', methods=['POST'])
def get_product_images():
    data = request.get_json()
    product_id = data.get('product_id')
    
    if not product_id:
        return jsonify({'status': 'error', 'message': 'Product ID is required'})
    
    # Path to temp folder - ensure lowercase match with TEMP_FOLDER
    temp_folder = os.path.join('static', 'images', 'temp')
    
    # Look for images with the product ID
    image_files = []
    product_images = glob.glob(os.path.join(temp_folder, f'{product_id}.*'))
    
    if not product_images:
        return jsonify({
            'status': 'error',
            'message': 'No images found for this product'
        })
    
    for image_path in product_images:
        # Convert path to URL format
        relative_path = image_path.replace('\\', '/').replace('static/', '')
        image_url = url_for('static', filename=relative_path)
        image_files.append(image_url)
    
    return jsonify({
        'status': 'success',
        'images': image_files
    })

# approve send Item images
@app.route('/get_transaction_images', methods=['GET'])
def get_transaction_images():
    try:
        transaction_id = request.args.get('transaction_id')
        if not transaction_id:
            return jsonify({"status": "error", "message": "Transaction ID is required"})

        # Query to get all products with images in this transaction
        query = """
            SELECT ProductID, SenderImage 
            FROM transaction_product_details 
            WHERE Transaction_uid = %s 
            AND SenderImage IS NOT NULL 
            AND SenderImage != ''
            AND SenderImage != '-'
        """
        
        results = execute_query(query, (transaction_id,))
        
        if not results:
            return jsonify({"status": "success", "images": []})

        # Format the response
        images = [{"productId": str(row["ProductID"])} for row in results]
        
        return jsonify({
            "status": "success",
            "images": images
        })

    except Exception as e:
        print(f"Error in get_transaction_images: {str(e)}")
        return jsonify({"status": "error", "message": str(e)})
    
# Received images    

#--------------------------------------------------------------------------------------------------------------------------------------------
#                                            Transaction History

@app.route('/transaction_history_table', methods=['GET'])
def transaction_history_table():

    name = session.get('login_row_data', {}).get('Name')
    # Get the project from session data
    projects = session.get('login_row_data', {}).get('Project', '').split(', ')
    toa = session.get('login_row_data', {}).get('TypeOfAccount')
    session_data = session.get('login_row_data', {})
    data = transaction_history.transaction_history_table_function(name,projects,toa,session_data)
    print("history table data", data)
    return data
#--------------------------------------------------------------------------------------------------------------------------------

@app.route('/my_invent_dashboard')
def my_invent_dashboard():
     
    user_data = session.get('login_row_data', {})
    name = user_data.get('Name', 'Unknown')
    user_id = user_data.get('ID', '')
    
    print(f"My inventory dashboard - User data: {user_data}")
    print(f"Name: {name}, ID: {user_id}")
    
    data = inventory.my_invent_dashboard_function(name, user_data)
    print('this is the myinvent data', data)
    return data



@app.route('/my_project_dashboard')
def my_project_dashboard():
    # Get the project from session data
    projects = session.get('login_row_data', {}).get('Project', '').split(', ')
    print('session data in my project inventory',session.get('login_row_data', {}))

    data = inventory.my_project_dashboard_function(projects,session.get('login_row_data', {}))
    print('my project inventory data',data)
    return data


@app.route('/invent_dashboard')
def invent_dashboard():
    data = inventory.invent_dashboard_function(session.get('login_row_data', {}))
    return data

#----------------------------------------------------------------------------------------------------------------------------------------------------------
#                                                 Transaction Progress


@app.route('/get_all_transactions', methods=['GET'])
def get_all_transactions():
    try:
        # Updated query to include Isreceive
        query = """
        SELECT 
            td.Transaction_uid, 
            td.EwayBillNo, 
            td.Source, 
            pm_source.Projects AS SourceName, 
            td.Destination, 
            pm_dest.Projects AS DestinationName,
            
            COALESCE(sm.Name, su.Name) AS SenderName,
            COALESCE(rm.Name, ru.Name) AS ReceiverName,
            
            td.Sender_uid, 
            td.Receiver_uid, 
            td.InitiationDate, 
            td.Status,
            td.ApprovalToSend, 
            td.ApprovalToReceive,
            td.Isreceive

        FROM transaction_details td

        LEFT JOIN managers_data sm ON td.Sender_uid = sm.manager_index_id
        LEFT JOIN user_info su ON td.Sender_uid = su.userinfo_uid

        LEFT JOIN managers_data rm ON td.Receiver_uid = rm.manager_index_id
        LEFT JOIN user_info ru ON td.Receiver_uid = ru.userinfo_uid

        LEFT JOIN projects_managers pm_source ON td.Source = pm_source.project_id
        LEFT JOIN projects_managers pm_dest ON td.Destination = pm_dest.project_id

        WHERE NOT (td.ApprovalToSend = 1 AND td.ApprovalToReceive = 1)
        """
        data = execute_query(query)

        # Transform data
        transformed_data = []
        for row in data:
            ats = row.get("ApprovalToSend")
            atr = row.get("ApprovalToReceive")
            isr = row.get("Isreceive")

            # Determine transaction type (title) based on the new logic
            if ats == 0 and atr == 0 and isr == 0:
                transaction_type = "Send Not Approved"  # Stage 1
            elif ats == 1 and atr == 0 and isr == 0:
                transaction_type = "Send Approved"  # Stage 2
            elif ats == 1 and atr == 0 and isr == 1:
                transaction_type = "Received"  # Stage 3
            elif ats == 1 and atr == 1 and isr == 1:
                transaction_type = "Transaction Complete"  # Stage 4
            elif ats == 2 and atr == 0 and isr == 0:
                transaction_type = "Send Disapproved"  # Stage 2 Disapproved
            elif ats == 1 and atr == 2 and isr == 1:
                transaction_type = "Received Disapproved"  # Stage 4 Disapproved
            elif ats == 1 and atr == 0 and isr == 2:
                transaction_type = "Not Received"  # Stage 3 Not Received
            else:
                transaction_type = "Unknown"

            transformed_data.append({
                "Transaction_uid": row["Transaction_uid"],
                "EwayBillNo": row.get("EwayBillNo", ""),
                "Source": row.get("SourceName") or row.get("Source", ""),
                "Destination": row.get("DestinationName") or row.get("Destination", ""),
                "SenderName": row.get("SenderName", ""),
                "ReceiverName": row.get("ReceiverName", ""),
                "Sender_uid": row.get("Sender_uid", ""),
                "Receiver_uid": row.get("Receiver_uid", ""),
                "InitiationDate": row.get("InitiationDate", ""),
                "Status": row.get("Status", ""),
                "TransactionType": transaction_type
            })

        # Filter out disapproved and not received transactions
        filtered_data = [
            t for t in transformed_data
            if t["TransactionType"] not in ("Send Disapproved", "Received Disapproved", "Not Received")
        ]
        print(f"Returning {len(filtered_data)} transactions")
        session_data = session.get('login_row_data', {})
        return jsonify({
            "filtered_data": filtered_data,
            "session_data": session_data
        })
    except Exception as e:
        print(f"Error in get_all_transactions: {str(e)}")
        return jsonify({"error": str(e)}), 500




@app.route('/transfer_progress_table_data', methods=['POST'])
def transfer_progress_table_data():
    try:
        data = request.get_json()
        transaction_uid = data.get('transaction_uid')
        if not transaction_uid:
            return jsonify({"error": "transaction_uid is required"}), 400
        
        # Call the function that handles fetching the data
        return transfer_progress.transfer_progress_table_data_function(transaction_uid)
    except Exception as e:
        print(f"Error in transfer_progress_table_data main function: {str(e)}")
        return jsonify({'error': str(e)}), 500


#------------------------------------------------------------------------------------------------------------------------------------------------------
#                                                Product History

@app.route('/get_product_transfer_history', methods=['POST'])
def get_product_transfer_history():
    filters = request.get_json()
    print("Received filters for product transfer history:", filters)

    data = Product_history.fetch_product_transfer_history(filters)

    print("Returning product transfer history:", data)
    return jsonify(data)


@app.route('/autocomplete_options', methods=['GET'])
def autocomplete_options():
    try:
        categories = execute_query("SELECT DISTINCT Category FROM inventory WHERE Category IS NOT NULL AND Category != ''")
        names = execute_query("SELECT DISTINCT Name FROM inventory WHERE Name IS NOT NULL AND Name != ''")
        makes = execute_query("SELECT DISTINCT Make FROM inventory WHERE Make IS NOT NULL AND Make != ''")
        models = execute_query("SELECT DISTINCT Model FROM inventory WHERE Model IS NOT NULL AND Model != ''")
        return jsonify({
            "categories": [row['Category'] for row in categories],
            "names": [row['Name'] for row in names],
            "makes": [row['Make'] for row in makes],
            "models": [row['Model'] for row in models]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



#--------------------------------------------------------------------------------------------------------------------------------------------------------
#                                                            Admin page

@app.route('/additem', methods=['POST'])
def additem():

    print("Received POST request at /additem")

    # Get data from the POST request
    data = request.json
    print("Request JSON data:", data)


    result = adddeleteitem.additem(data)
    print("Result from adddeleteitem.additem:", result)

    return result 

@app.route('/additem_dropdown_data', methods=['GET'])
def additem_dropdown_data():
    try:
        # Get all projects
        projects = execute_query("SELECT project_id, Projects FROM projects_managers")
        # Get all users (owners)
        users = execute_query("SELECT ID, Name, project_id, TypeOfAccount FROM user_info WHERE TypeOfAccount != 'Admin'")
        # Get all categories
        categories = execute_query("SELECT category_name FROM categories")
        return jsonify({
            "projects": projects,
            "users": users,
            "categories": [row['category_name'] for row in categories]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/deleteitem', methods=['POST'])
def deleteitem_api():
    data = request.get_json()
    return adddeleteitem.deleteitem(data)



@app.route('/addcategory', methods=['POST'])
def addcategory():
    try:
        # Get data from the POST request
        data = request.json
        print("Received POST request data:", data)

        # Call the function to add the category from add_category.py
        return add_category.add_category(data)
    
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@app.route('/get_categories', methods=['GET'])
def get_categories():
    try:
        categories = execute_query("SELECT category_name FROM categories WHERE category_name IS NOT NULL AND category_name != ''")
        return jsonify(categories)
    except Exception as e:
        return jsonify([]), 500




@app.route('/get_employee_data_panel', methods=['GET'])
def get_employee_data_panel():
    try:
        # SQL query to fetch all employee data with project names from the user_info table
        query = """
            SELECT ui.*, pm.Projects as Project 
            FROM user_info ui
            LEFT JOIN projects_managers pm ON ui.project_id = pm.project_id
        """
        
        # Execute the query to get employee data
        emp_data = execute_query(query)

        # Get session data (assuming session has login_row_data)
        session_data = session.get('login_row_data', {})

        # Combine session data and employee data into a single dictionary
        combined_data = {
            'session_data': session_data,
            'emp_data': emp_data
        }

        # Print the combined data for debugging
        print("Employee data with projects:", emp_data)

        # Return the combined data as JSON
        return jsonify(combined_data)

    except Exception as e:
        # Handle exceptions (e.g., database issues)
        print("Error in get_employee_data_panel:", str(e))
        return jsonify({'error': str(e)}), 500


# Initialize an empty DataFrame
json_data = pd.DataFrame()

# Route to send the transaction UID for sender manager approval
@app.route('/send_Transaction_uid')
def send_Transaction_uid():        
    global json_data
    transaction_uid = request.args.get('transaction_uid')
    print('This is the transaction_uid:', transaction_uid)
    
    # Use the function that shows all items (no ItemStatus filter) for sender manager approval
    json_data = common_functions.extract_transaction_data_for_sender_approval(transaction_uid)
    return "Transaction UID received successfully"

# Route to send the transaction UID for receiver approval
@app.route('/receive_Transaction_uid')
def receive_Transaction_uid():        
    global json_data
    transaction_uid = request.args.get('transaction_uid')
    print('This is the transaction_uid for receiver:', transaction_uid)
    
    # Use the function that shows only pending items (ItemStatus IS NULL) for receiver approval
    json_data = common_functions.extract_transaction_data(transaction_uid)
    return "Transaction UID received successfully"

@app.route('/get_form_data')
def get_form_data():
    transaction_uid = request.args.get('transaction_uid')
    if not transaction_uid:
        return jsonify({"error": "Transaction UID is missing"}), 400

    data = transaction_history.get_transaction_details_by_uid(transaction_uid)
    return jsonify(data)



# @app.route('/ewaybill_data/<transaction_uid>')
# def ewaybill_data(transaction_uid):
#     global json_data

#     # Fetch transaction data based on transaction_uid
#     json_data = common_functions.extract_transaction_data_for_sender_approval(transaction_uid)

#     # Ensure json_data is a list of dictionaries
#     if isinstance(json_data, str):
#         json_data = json.loads(json_data)
    
#     print("This is the JSON data for ewaybill data", json_data)
    
#     # Extract the Source and Destination from the first dictionary in the list
#     source = json_data[0]["Source"]
#     print('This is the source:', source)
    
#     destination = json_data[0]["Destination"]
#     print('This is the destination:', destination)

#     # Get address data
#     address_data = ewaybill_address_data(source, destination)
#     print('This is the address data:', address_data)

#     # Combine the data
#     combined_data = {
#         'address_data': address_data,
#         'json_data': json_data
#     }
#     print('This is the combined data for ewaybill_data:', combined_data)
#     # jsonify(combined_data)
#     # Return the combined data as JSON
#     return jsonify(combined_data)


# def ewaybill_address_data(source, destination):
#     try:
#         # SQL query to get source and destination data from the 'projects_managers' table
#         source_query = """
#             SELECT * FROM projects_managers WHERE Projects = %s
#         """
#         destination_query = """
#             SELECT * FROM projects_managers WHERE Projects = %s
#         """
        
#         # Execute the queries
#         source_data = execute_query(source_query, (source,))
#         destination_data = execute_query(destination_query, (destination,))
        
#         # Create a dictionary with source and destination data
#         data_dict = {
#             "Source": source_data,
#             "Destination": destination_data
#         }
#         print("This is the data dict:", data_dict)
#         return data_dict
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

def find_inventory_hsn_column():
    """Find which HSN column exists in inventory table."""
    candidates = ['HSN Code', 'HSN_Code', 'HSNCode', 'HSN']
    rows = execute_query(
        """
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'inventory'
        """
    )
    have = {r['COLUMN_NAME'] for r in rows}
    for col in candidates:
        if col in have:
            return f"inv.`{col}`"  # backtick-escaped identifier
    return None


@app.route('/ewaybill_data/<transaction_uid>')
def ewaybill_data(transaction_uid):
    try:
        # 1) Get Source, Destination project_ids
        tx_rows = execute_query(
            """
            SELECT Source, Destination
            FROM transaction_details
            WHERE Transaction_uid = %s
            """,
            (transaction_uid,)
        )
        if not tx_rows:
            return jsonify({'error': f'No transaction found for uid {transaction_uid}'}), 404

        tx = tx_rows[0]
        source_pid = tx.get('Source')
        dest_pid   = tx.get('Destination')

        # 2) Projects data by project_id
        def get_project(project_id):
            if not project_id:
                return {}
            rows = execute_query(
                """
                SELECT Projects, Address, GSTIN, STATE, State_Code
                FROM projects_managers
                WHERE project_id = %s
                """,
                (project_id,)
            )
            return rows[0] if rows else {}

        source_row = get_project(source_pid)
        dest_row   = get_project(dest_pid)

        # 3) Products join
        inv_hsn_col = find_inventory_hsn_column()
        if inv_hsn_col:
            hsn_select = f"COALESCE({inv_hsn_col}, '-') AS HSN_Code"
        else:
            hsn_select = "'-' AS HSN_Code"

        products = execute_query(
            f"""
            SELECT 
                tpd.ProductID,
                COALESCE(inv.Name,'-')      AS Name,
                COALESCE(inv.Category,'-')  AS Category,
                {hsn_select}
            FROM transaction_product_details tpd
            LEFT JOIN inventory inv ON inv.ProductID = tpd.ProductID
            WHERE tpd.Transaction_uid = %s
            """,
            (transaction_uid,)
        )

        for p in products:
            p['Rate'] = '-'  # default rate

        payload = {
            'projects': {
                'source': source_row,
                'destination': dest_row
            },
            'products': products
        }
        return jsonify(payload)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update_employee_details', methods=['POST'])
def update_employee_details():
    try:
        # Get the data from the request
        req_data = request.get_json()
        name = req_data.get('Name')
        project_name = req_data.get('Project') 
        email = req_data.get('email')
        phone = req_data.get('phone')

        # Query to check if the employee exists
        check_employee_query = """
            SELECT * FROM user_info 
            WHERE Name = %s AND TypeOfAccount = 'Employee'
        """
        employee_exists = execute_query(check_employee_query, (name,))

        if employee_exists:
            
            get_project_id_query = """
                SELECT project_id FROM projects_managers WHERE Projects = %s
            """
            project_result = execute_query(get_project_id_query, (project_name,))

            if not project_result:
                
                return jsonify({'error': f'Project "{project_name}" not found'}), 404

            project_id = project_result[0]['project_id']
            
            update_employee_query = """
                UPDATE user_info 
                SET project_id = %s, MailID = %s, PhoneNo = %s 
                WHERE Name = %s AND TypeOfAccount = 'Employee'
            """
            execute_query(update_employee_query, (project_id, email, phone, name), commit=True)
            return jsonify({'message': 'success'}), 200
        else:
            return jsonify({'error': 'Employee name not found or AccountType is not Employee'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/delete_employee_details', methods=['POST'])
def delete_employee_details():
    try:
        # Get the data from the request
        req_data = request.get_json()
        name = req_data.get('Name')
        project = req_data.get('Project')
        email = req_data.get('email')
        phone = req_data.get('phone')

        print('Deleting employee data:', req_data)

        # Check if there are pending items in the 'inventory' table for this employee
        inventory_query = """
            SELECT * FROM inventory WHERE Owner = %s
        """
        inventory_data = execute_query(inventory_query, (name,))
        
        if inventory_data:
            return jsonify({'message': 'Pending Items'}), 400

        # Check if there are pending transactions in the 'handover_data' table for this employee
        handover_query = """
            SELECT * FROM handover_data 
            WHERE (Sender = %s OR Receiver = %s) 
            AND Status = 'Pending'
        """
        handover_data = execute_query(handover_query, (name, name))
        
        if handover_data:
            return jsonify({'message': 'Transaction Process'}), 400

        # Create a boolean mask for the condition
        employee_query = """
            SELECT * FROM user_info WHERE Name = %s AND TypeOfAccount = 'Employee'
        """
        employee_exists = execute_query(employee_query, (name,))
        
        # Check if the employee exists
        if employee_exists:
            # SQL query to delete the employee from 'user_info' table
            delete_employee_query = """
                DELETE FROM user_info WHERE Name = %s AND TypeOfAccount = 'Employee'
            """
            execute_query(delete_employee_query, (name,), commit=True)
            return jsonify({'message': 'success'}), 200
        else:
            return jsonify({'error': 'Employee name not found or AccountType is not Employee'}), 404

    except Exception as e:
        print(f"Error during employee deletion: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/get_projects_for_registration', methods=['GET'])
def get_projects_for_registration():
    try:
        # SQL query to get project names and IDs
        query = "SELECT Projects, project_id FROM projects_managers"

        # Execute the query and fetch results
        projects = execute_query(query)

        # Return the list of projects as JSON
        return jsonify({'projects': projects}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500




# to get project dropdown in emppanel page    
@app.route('/get_projects', methods=['GET'])
def get_projects():
    try:
        # Query to fetch all project names
        project_query = "SELECT Projects FROM projects_managers"
        projects_data = execute_query(project_query)
        
        # Extract project names into a list
        project_list = [row['Projects'] for row in projects_data]
        project_list.sort()  # Sort alphabetically (A-Z)
        
        return jsonify({'projects': project_list}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500    



@app.route('/registeremployee', methods=['POST'])
def register_employee():
    try:

        # Access form data and strip whitespace
        form_data = {key: value.strip() if isinstance(value, str) else value for key, value in request.form.items()}

        # Extract form values after stripping whitespace
        name = form_data.get('name')
        id = form_data.get('id')
        mail = form_data.get('mail')
        phone = form_data.get('phone')
        typeofaccount = form_data.get('typeofaccount')
        project = form_data.get('project')

        # Print the details (for debugging purposes)
        print('formdetails', name, id, mail, phone, typeofaccount, project)

        # SQL query to check if employee already exists
        check_existing_query = "SELECT * FROM user_info WHERE ID = %s"
        existing_user = execute_query(check_existing_query, (id,))

        # If the employee already exists, return an error
        if existing_user:
            return jsonify({'status': 'error', 'message': 'already exists'}), 400
        
        # SQL query to check if employee already exists
        check_existing_query_manager = "SELECT * FROM managers_data WHERE ID = %s"
        existing_manager = execute_query(check_existing_query_manager, (id,))

        # If the employee already exists, return an error
        if existing_manager:
            return jsonify({'status': 'error', 'message': 'already exists'}), 400


        if (typeofaccount=="Employee"):
                
                # SQL query to insert a new employee into the user_info table
                insert_employee_query = """
                    INSERT INTO user_info (ID, Name,  Password, TypeOfAccount, project_id, MailID, PhoneNo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                execute_query(insert_employee_query, (id, name, id, typeofaccount, project, mail, phone), commit=True)

        else:
                # SQL query to insert a new employee into the user_info table
                insert_employee_query = """
                    INSERT INTO managers_data ( ID, Name,  Password, TypeOfAccount, MailID, PhoneNo)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
        
                execute_query(insert_employee_query, (id, name, id, typeofaccount, mail, phone), commit=True)

        # Return success response
        return jsonify({'status': 'success', 'message': 'Registration successful'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500




@app.route('/additem_projectowner', methods=['POST'])
def additem_projectowner():
    try:
        # Step 1: Get all projects and their associated managers (with manager name and user ID)
        project_query = """
        SELECT pm.Projects, pm.project_id, pm.Manager AS manager_index_id, m.Name AS manager_name, m.ID AS manager_userid
        FROM projects_managers pm
        LEFT JOIN managers_data m ON pm.Manager = m.manager_index_id
        """
        try:
            projects_info = execute_query(project_query)
            print("[DEBUG] Projects info retrieved successfully:", projects_info)
        except Exception as e:
            print("[ERROR] Failed to execute project query:", str(e))
            return jsonify({'error': 'Failed to retrieve projects'}), 500

        # Step 2: Get employee information from user_info
        user_query = """
            SELECT ID, Project 
            FROM user_info 
            WHERE TypeOfAccount != 'Admin'
        """
        try:
            user_info = execute_query(user_query)
            print("[DEBUG] User info retrieved successfully:", user_info)
        except Exception as e:
            print("[ERROR] Failed to execute user query:", str(e))
            return jsonify({'error': 'Failed to retrieve user information'}), 500

        # Step 3: Create a dictionary of users per project
        user_project_dict = {}
        for row in user_info:
            project = row['Project']
            name = row['ID']
            if project in user_project_dict:
                user_project_dict[project].append(name)
            else:
                user_project_dict[project] = [name]

        print("[DEBUG] User project dictionary:", user_project_dict)

        # Step 4: Create a dictionary of managers and concatenate with users per project
        project_emp_dict = {}
        for project_row in projects_info:
            project = project_row['Projects']
            manager_name = project_row.get('manager_name', '')
            manager_userid = project_row.get('manager_userid', '')
            manager_index_id = project_row.get('manager_index_id', '')
            # Represent manager as a dict with name, user ID, and index ID
            manager_info = {
                'manager_name': manager_name,
                'manager_userid': manager_userid,
                'manager_index_id': manager_index_id
            }
            combined_list = [manager_info]
            # Append users to the same project if available
            if project in user_project_dict:
                combined_list.extend(user_project_dict[project])
            project_emp_dict[project] = combined_list
            print(f"[DEBUG] Combined list for project '{project}':", combined_list)

        print("[DEBUG] Final project-employee dictionary:", project_emp_dict)

        # Step 5: Read unique product categories from the inventory
        category_query = "SELECT category_name FROM categories"
        try:
            inventory_info = execute_query(category_query)
            print("[DEBUG] Inventory info retrieved successfully:", inventory_info)
        except Exception as e:
            print("[ERROR] Failed to execute category query:", str(e))
            return jsonify({'error': 'Failed to retrieve categories'}), 500

        # Extract unique categories from inventory data
        unique_category_list = [row['category_name'] for row in inventory_info]
        print("[DEBUG] Unique categories extracted:", unique_category_list)

        # Step 6: Combine everything into a final JSON response
        combined_data = {
            "project_emp_dict": project_emp_dict,
            "categories": unique_category_list,
            "session_data": session.get('login_row_data', {})
        }

        print("[DEBUG] Combined data for response:", combined_data)
        return jsonify(combined_data)

    except Exception as e:
        print("[ERROR] An unexpected error occurred:", str(e))
        return jsonify({'error': 'An unexpected error occurred'}), 500
    
#-------------------------------------------------------------------------------------------------------------------------------------   
#                                                   Total inventory

@app.route('/delete_item', methods=['POST'])
def delete_item():
    try:
        # Get the Product ID from the request
        product_id = request.json.get('product_id')
        
        print("this is the productid", product_id)

        # Query to check if the Product ID exists in the inventory
        check_product_query = "SELECT * FROM inventory WHERE ProductID = %s"
        product_exists = execute_query(check_product_query, (product_id,))

        if not product_exists:
            return jsonify({"message": "Product ID not found", "status": "fail"}), 404

        # Get the current timestamp for deletion date
        delete_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        

        # First, get the product data to insert into afterdelete table
        get_product_query = "SELECT * FROM inventory WHERE ProductID = %s"
        product_data = execute_query(get_product_query, (product_id,))
        
        if not product_data:
            return jsonify({"message": "Product not found", "status": "fail"}), 404
            
        product = product_data[0]
        
        # Insert the product into the afterdelete table with explicit values
        insert_deleted_product_query = """
            INSERT INTO afterdelete (ProductID, Category, Name, Make, Model, ProductSerial, Project, Owner, `Condition`, Handover_Date, empname, Delete_Date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        execute_query(insert_deleted_product_query, (
            product.get('ProductID'),
            product.get('Category'),
            product.get('Name'),
            product.get('Make'),
            product.get('Model'),
            product.get('ProductSerial'),
            product.get('Project', '-'),
            product.get('Owner'),
            product.get('Condition'),
            product.get('Handover_Date'),
            product.get('empname'),
            delete_date
        ), commit=True)

        # Query to delete the product from the inventory
        delete_product_query = "DELETE FROM inventory WHERE ProductID = %s"
        execute_query(delete_product_query, (product_id,), commit=True)

        return jsonify({"message": "Product deleted successfully", "status": "success"}), 200

    except Exception as e:
        return jsonify({"message": str(e), "status": "error"}), 500


@app.route('/deleteitem', methods=['POST'])
def deleteitem():
    try:
        data = request.get_json()
        category = data.get('category')
        name = data.get('name')
        make = data.get('make')
        model = data.get('model')
        product_serial = data.get('product_serial')
        owner = data.get('owner')
        project = data.get('project')

        print("Delete item request:", data)

        # Query to find the product based on all criteria
        find_product_query = """
            SELECT * FROM inventory 
            WHERE Category = %s AND Name = %s AND Make = %s AND Model = %s 
            AND ProductSerial = %s AND Owner = %s AND Project = %s
        """
        product_exists = execute_query(find_product_query, (category, name, make, model, product_serial, owner, project))

        if not product_exists:
            return jsonify({"message": "No matching item found in the database"}), 404

        product_id = product_exists[0]['ProductID']
        print("Found product ID:", product_id)

        # Get the current timestamp for deletion date
        delete_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Query to insert the product into the afterdelete table
        insert_deleted_product_query = """
            INSERT INTO afterdelete (ProductID, Category, Name, Make, Model, ProductSerial, Project, Owner, `Condition`, Handover_Date, empname, Delete_Date)
            SELECT ProductID, Category, Name, Make, Model, ProductSerial, Project, Owner, `Condition`, Handover_Date, empname, %s 
            FROM inventory 
            WHERE ProductID = %s
        """
        execute_query(insert_deleted_product_query, (delete_date, product_id), commit=True)

        # Query to delete the product from the inventory
        delete_product_query = "DELETE FROM inventory WHERE ProductID = %s"
        execute_query(delete_product_query, (product_id,), commit=True)

        return jsonify({"message": "Item deleted successfully"}), 200

    except Exception as e:
        print(f"Error in deleteitem: {str(e)}")
        return jsonify({"message": str(e)}), 500


@app.route('/save_item', methods=['POST'])
def save_item():
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        updated_data = data.get('updated_data', {})

        print("Updating ProductID:", product_id)
        print("New Data:", updated_data)

        # Check if product exists
        check_product_query = "SELECT * FROM inventory WHERE ProductID = %s"
        product_exists = execute_query(check_product_query, (product_id,))

        if not product_exists:
            return jsonify({"message": "Product ID not found", "status": "fail"}), 404

        # Current DB row
        current_row = product_exists[0]

        # Use updated data if provided; otherwise fallback to current DB value or '-'
        def get_value(key, fallback='-'):
            val = updated_data.get(key)
            if val is None or str(val).strip() == '':
                return current_row.get(key) or fallback
            return str(val).strip()

        category = get_value('Category')
        name = get_value('Name')
        make = get_value('Make')
        model = get_value('Model')
        set_value = get_value('set')

        print("Final values to update:", category, name, make, model, set_value)

        # Update query
        update_query = """
            UPDATE inventory
            SET Category = %s,
                Name = %s,
                Make = %s,
                Model = %s,
                `set` = %s
            WHERE ProductID = %s
        """
        update_values = (category, name, make, model, set_value, product_id)

        # Execute update
        execute_query(update_query, update_values, commit=True)

        return jsonify({"message": "Product updated successfully", "status": "success"}), 200

    except Exception as e:
        print("Error in /save_item:", str(e))
        return jsonify({"message": str(e), "status": "error"}), 500




# ---------------------------------------------------------------------------------------------------------------------------------------
#                                                Project Section

@app.route('/get_unique_projects')
def get_unique_projects():
    try:
        # Query to get all the data from the projects_managers table
        query_projects = "SELECT * FROM projects_managers"
        project_data = execute_query(query_projects)

        # Query to get Manager names and their manager_index_id from the managers_data table
        query_managers = "SELECT Name, manager_index_id FROM managers_data;"
        manager_data = execute_query(query_managers)

        # Check if manager data is fetched
        print("Manager Data:", manager_data)

        # Prepare manager data with both Name and manager_index_id
        managers = [{"Manager": manager['Name'], "manager_index_id": manager['manager_index_id']} for manager in manager_data]

        # Return the projects and manager data
        return jsonify({'projects': project_data, 'managers': managers})

    except Exception as e:
        print(f"Error: {e}")  # Additional error debugging
        return jsonify({'error': str(e)}), 500



@app.route('/add_new_project', methods=['POST'])
def add_new_project():
    try:
        project_data = request.json

        # Strip whitespace from all string values in the incoming data
        project_data = {key: value.strip() if isinstance(value, str) else value for key, value in project_data.items()}

        print(f'Processed project_data: {project_data}')

        query = """
            INSERT INTO projects_managers (Projects, Address, GSTIN, STATE, State_Code, Manager)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        execute_query(query, (
            project_data['Project'], 
            project_data['Address'], 
            project_data['GSTIN'], 
            project_data['STATE'], 
            project_data['State_Code'], 
            project_data['Manager']
        ), commit=True)

        return jsonify({"message": "Project added successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/update_project_details', methods=['POST'])
def update_project_details():
    try:
        print("Received request to update project details.")
        updated_data = request.json

        if not updated_data:
            print("No data received in the request.")
            return jsonify({"error": "No data received"}), 400

        print("Request data received:", updated_data)

        required_fields = ['Project_id', 'Address', 'GSTIN', 'STATE', 'State_Code', 'Manager']
        for field in required_fields:
            if field not in updated_data:
                print(f"Missing field: {field}")
                return jsonify({"error": f"Missing field: {field}"}), 400

        print("All required fields are present.")

        # Strip whitespace
        updated_data = {key: value.strip() if isinstance(value, str) else value for key, value in updated_data.items()}

        # Extract values
        project_id = updated_data['Project_id']
        address = updated_data['Address']
        gstin = updated_data['GSTIN']
        state = updated_data['STATE']
        state_code = updated_data['State_Code']
        manager_index_id = updated_data['Manager']  # Now we're directly getting the manager_index_id from frontend

        print(f"Extracted data: Project_id={project_id}, Address={address}, GSTIN={gstin}, STATE={state}, State_Code={state_code}, Manager (ID)={manager_index_id}")

        # Update query using manager_index_id (directly passed from frontend)
        update_query = """
            UPDATE projects_managers
            SET Address = %s, GSTIN = %s, STATE = %s, State_Code = %s, Manager = %s
            WHERE project_id = %s
        """
        print("Prepared query:", update_query)

        try:
            print("Executing database query...")
            execute_query(update_query, (address, gstin, state, state_code, manager_index_id, project_id), commit=True)
            print("Database query executed successfully.")
        except Exception as db_error:
            print(f"Database query failed: {str(db_error)}")
            return jsonify({"error": f"Database query failed: {str(db_error)}"}), 500

        print("Project updated successfully.")
        return jsonify({"message": "Project updated successfully"}), 200

    except KeyError as key_error:
        print(f"Key error occurred: {str(key_error)}")
        return jsonify({"error": f"Key error: {str(key_error)}"}), 400

    except TypeError as type_error:
        print(f"Type error occurred: {str(type_error)}")
        return jsonify({"error": f"Type error: {str(type_error)}"}), 400

    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500



@app.route('/delete_project', methods=['POST'])
def delete_project():
    try:
        project_id = request.json.get('project_id')
        if not project_id:
            print("Project ID not provided in request")
            return jsonify({"error": "Project ID is required"}), 400

        print(f"Deleting project with ID: {project_id}")
        
        query = """
            DELETE FROM projects_managers
            WHERE project_id = %s
        """

        # Assuming `execute_query` is a helper function for executing DB queries
        execute_query(query, (project_id,), commit=True)
        
        return jsonify({"message": "Project deleted successfully"}), 200

    except KeyError as e:
        print(f"Key error: {str(e)}")
        return jsonify({"error": "Invalid request format, 'project_id' is missing"}), 400

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

# -----------------------------------------------------------------------------------------------------------------------------
#                                                      Managers Section


@app.route('/get_all_managers', methods=['GET'])
def get_all_managers():
    try:
        # Query to get all the data from the managers_data table
        query_managers = "SELECT * FROM managers_data"
        manager_data = execute_query(query_managers)
        
        print("Raw manager data from database:", manager_data)
        print("Number of managers found:", len(manager_data) if manager_data else 0)
        
        # Check specific manager for debugging
        for manager in manager_data:
            if manager.get('manager_index_id') == 1001:
                print("Manager 1001 data:", manager)
                print("Physical_location value:", manager.get('Physical_location'), "Type:", type(manager.get('Physical_location')))

        # TEMPORARY: Skip Pandas conversion to test if that's causing the issue
        print("Skipping Pandas conversion, using raw data directly")
        unique_managers = manager_data  # Use raw data instead of DataFrame conversion
        
        # Remove duplicates manually if needed
        seen_ids = set()
        filtered_managers = []
        for manager in unique_managers:
            if manager.get('ID') not in seen_ids:
                seen_ids.add(manager.get('ID'))
                filtered_managers.append(manager)
        
        unique_managers = filtered_managers
        
        print("Unique managers after manual deduplication:", len(unique_managers))

        # Query to get the project data
        query_projects = "SELECT project_id, Projects FROM projects_managers"
        project_data = execute_query(query_projects)

        # Return the filtered unique managers and projects
        return jsonify({'projects': project_data, 'managers': unique_managers})

    except Exception as e:
        print("Error in get_all_managers:", str(e))
        return jsonify({'error': str(e)}), 500


# Route to add a new manager
@app.route('/add_new_manager', methods=['POST'])
def add_new_manager():
    try:

        manager_data = request.json
        print(f'manager_data: {manager_data}')

        # Step 3: Strip whitespace from all string fields
        manager_data = {key: value.strip() if isinstance(value, str) else value for key, value in manager_data.items()}
        print

        # Ensure all required fields are present in the incoming data
        manager_name = manager_data.get('Manager_Name')
        manager_id = manager_data.get('Manager_ID')  # Assuming Manager_ID should be passed
        manager_password = manager_id
        # manager_project = manager_data.get('Project')  # Assuming a Project is provided
        manager_email = manager_data.get('Email')
        manager_phone = manager_data.get('Phone')


        query = """
        select * from managers_data where Name = %s 
        """

        manager_exists = execute_query(query,(manager_id,))
        if manager_exists:
            print("Manager code already exists")
            return jsonify({"message": "exists"}), 400

        # Debugging: Print extracted data to ensure everything is correct
        print(f"Name: {manager_name}, ID: {manager_id}, Password: {manager_password}, "
              f"Email: {manager_email}, Phone: {manager_phone} ///")

        # SQL Query to insert a new manager
        query = """
            INSERT INTO managers_data (Name, ID, Password, MailID, PhoneNo, TypeOfAccount)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        toa = "Manager"
        # Execute the query with the extracted data
        execute_query(query, (manager_id, manager_name, manager_id, manager_email, manager_phone, toa), commit=True)

        return jsonify({"message": "Manager added successfully"}), 200
    except Exception as e:
        # Debugging: Print the error message for debugging purposes
        print(f"Error occurred while adding manager: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Route to update manager details
@app.route('/update_manager_details', methods=['POST'])
def update_manager_details():
    try:
        # Get the updated data from the request
        updated_data = request.json
        
        # Debugging: Print the received data to ensure it's correct
        print("Received updated manager details:", updated_data)

        # SQL Query to update manager details
        query = """
            UPDATE managers_data
            SET Physical_location = %s, MailID = %s, PhoneNo = %s
            WHERE manager_index_id = %s
        """
        
        # Debugging: Print the query to check if it's correct
        print("Executing query:", query)
        print("Values to be updated:", (updated_data['PhysicalLocation'], updated_data['Email'], updated_data['Phone'], updated_data['Manager_index_id']))

        # Execute the query
        result = execute_query(query, (updated_data['PhysicalLocation'], updated_data['Email'], updated_data['Phone'], updated_data['Manager_index_id']), commit=True)
        
        # Debugging: Print the result of the execution
        print("Result of execute_query:", result)
        
        # Verify the update by checking the database
        verify_query = "SELECT Physical_location, MailID, PhoneNo FROM managers_data WHERE manager_index_id = %s"
        verify_result = execute_query(verify_query, (updated_data['Manager_index_id'],))
        print("Verification query result:", verify_result)
        
        if verify_result:
            print("Updated values in database:", verify_result[0])
        else:
            print("No record found for verification")

        return jsonify({"message": "Manager updated successfully"}), 200
    
    except Exception as e:
        # Debugging: Print the error message
        print("Error during update:", str(e))
        return jsonify({"error": str(e)}), 500



# Route to delete a manager
@app.route('/delete_manager', methods=['POST'])
def delete_manager():
    try:
        manager_id = request.json.get('Manager_index_id')
        manager_code = request.json.get('manager_code')

        query = "DELETE FROM managers_data WHERE manager_index_id = %s"
        execute_query(query, (manager_id,), commit=True)

        return jsonify({"message": "Manager deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
     app.run(debug=True, host='0.0.0.0', port=7070)