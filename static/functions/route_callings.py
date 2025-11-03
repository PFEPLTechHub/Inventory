from flask import Blueprint, render_template

page_routes = Blueprint('page_routes', __name__)

@page_routes.route('/')
def index():
    return render_template('loginpage.html')

@page_routes.route('/welcome')
def welcome():
    return render_template('welcome.html')

@page_routes.route('/register')
def register():
    return render_template('registrationpage.html')


@page_routes.route('/homepage')
def homepage():
    return render_template('homepage.html')


@page_routes.route('/return_to_login')
def return_to_login():
    return render_template('login.html')

@page_routes.route('/send_items')
def send_items():
    return render_template('handover.html')


@page_routes.route('/approvetable')
def approvetable():
    return render_template('approvalTable.html')

@page_routes.route('/display_send_approval')
@page_routes.route('/display_send_approval/<transaction_uid>')
def display_send_approval(transaction_uid=None):
    return render_template('approvesend.html', transaction_uid=transaction_uid)

# @page_routes.route('/display_receive_approval')
# def display_receive_approval():
#     return render_template('approvereceive.html')

@page_routes.route('/display_receive_approval')
@page_routes.route('/display_receive_approval/<transaction_uid>')
def display_receive_approval(transaction_uid=None):
    return render_template('approvereceive.html', transaction_uid=transaction_uid)


@page_routes.route('/receive_form_data')
@page_routes.route('/receive_form_data/<transaction_uid>')
def receive_form_data(transaction_uid=None):
    print(f"Accessing receive_form_data with transaction_uid: {transaction_uid}")  # Debug print
    return render_template('receiverform.html', transaction_uid=transaction_uid)

@page_routes.route('/receive_table')
def receive_table():
    return render_template('recieveTable.html')



@page_routes.route('/transactionprogresstable')
def transactionprogresstable():
    return render_template('transactionprogresstable.html')

@page_routes.route('/display_transaction_progess')
@page_routes.route('/display_transaction_progess/<transaction_uid>')
def display_transaction_progess_table(transaction_uid=None):
    return render_template('transactionprogressform.html', transaction_uid=transaction_uid)

    
@page_routes.route('/transactionhistorytable')
def transactionhistorytable():
    return render_template('transactionhistorytable.html')


@page_routes.route('/transaction_history_form_data')
@page_routes.route('/transaction_history_form_data/<transaction_uid>')
def transaction_history_form_data(transaction_uid=None):
    return render_template('transactionhistoryform.html', transaction_uid=transaction_uid)


@page_routes.route('/invent')
def invent():
    return render_template('inventory.html')

@page_routes.route('/project_invent')
def project_invent():
    return render_template('projectinventory.html')

@page_routes.route('/my_invent')
def my_invent():
    return render_template('myinventory.html')


@page_routes.route('/additem')
def additem():
    return render_template('additem.html')

@page_routes.route('/deleteitem')
def deleteitem():
    return render_template('deleteitem.html')

@page_routes.route('/emppanelpage')
def emppanelpage():
    return render_template('emppanelpage.html')



@page_routes.route('/ewaybill')
@page_routes.route('/ewaybill/<transaction_uid>')
def ewaybill(transaction_uid=None):
    return render_template('ewaybill.html', transaction_uid=transaction_uid)


@page_routes.route('/myprofilepage')
def myprofilepage():
    return render_template('myprofilepage.html')


@page_routes.route('/userguidepage')
def userguidepage():
    return render_template('userguide.html')


@page_routes.route('/uniqueprojects')
def uniqueprojects():
    return render_template('uniqueprojects.html')


@page_routes.route('/managers_panel')
def managers_panel():
    return render_template('managers_panel.html')  

@page_routes.route('/Product_history')
def Product_history():
    return render_template('ProductHistory.html')

@page_routes.route('/add_category')
def add_category():
    return render_template('add_Category.html')

# @page_routes.route('/image_carousel')
# def image_carousel():
#     return render_template('image_carousel.html')


