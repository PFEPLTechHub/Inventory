$(document).ready(function(){
    var allData;

    // Make the AJAX request with error handling
    $.getJSON('/approval_table')
        .done(function(data) {
            allData = data.filtered_data;
            var sessionData = data.session_data;

            console.log('this is dataaa', allData);

            adjustButtonsVisibility(sessionData);

            populateTable(allData);
            populateFilterDropdowns(allData);
            attachFilterListeners();
            attachSearchListener();

        })
        .fail(function(jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error("Request Failed: " + err);
        })
        .always(function() {
            console.log("Request completed");
        });

    // Function to populate table with data
    function populateTable(data) {
        var i = 0;
        $('#transactionData').empty();
        
        // Check if there's no data to display
        if (!data || data.length === 0) {
            $('#transactionTable tbody').append('<tr><td colspan="10" style="text-align: center; padding: 20px;">No pending approvals found</td></tr>');
            return;
        }
        
        $.each(data, function(index, transaction){
            $('#transactionTable tbody').append('<tr>' +
                '<td><input type="radio" name="selection" class="radioButton" data-formid="'+ transaction.Transaction_uid+'"></td>' +
                '<td>' + (++i) + '</td>' +
                '<td>' + transaction.Transaction_uid + '</td>' + // <-- Added Form No. column
                '<td>' + (transaction.EwayBillNo || '-') + '</td>' +
                '<td>' + transaction.Source + '</td>' + // Use Source (now contains name)
                '<td>' + transaction.Destination + '</td>' + // Use Destination (now contains name)
                '<td>' + transaction.SenderName + '</td>' +     //<!-- This is the Sender Name -->
                '<td>' + transaction.ReceiverName + '</td>' +     //<!-- This is the Receiver Name -->
                '<td>' + transaction.InitiationDate + '</td>' +
                '<td>' + transaction.ApprovalType + '</td>' +
                '</tr>');
            console.log(transaction.EwayBillNo);
            console.log('This is approvetype:',transaction.ApprovalType)
        });
    }
    

    // Event listener for view button
    document.getElementById("viewButton").addEventListener("click", function() {
        var table = document.getElementById("transactionTable");
        var selectedRow;
        var approvalType;

        // Check if at least one radio button is selected
        var atLeastOneSelected = false;
        for (var i = 0; i < table.rows.length; i++) {
            var radioButton = table.rows[i].querySelector("input[type='radio']");
            if (radioButton && radioButton.checked) {
                selectedRow = table.rows[i];
                console.log("Selected Row:", selectedRow);

                approvalType = selectedRow.cells[9]?.textContent?.trim().toLowerCase() || '';
                console.log("Normalized ApprovalType:", approvalType);
                atLeastOneSelected = true;
                break;
            }
        }

        // If at least one radio button is selected, proceed
        if (atLeastOneSelected) {
            var transaction_uid = selectedRow.cells[2].textContent; // Change index if needed
            console.log(transaction_uid);

            // Send the form ID to the Flask route using XMLHttpRequest
            sendTransaction_uid(transaction_uid);


            // Determine the route based on the approval type
            var route;
            if (approvalType.toLowerCase() === 'send') {
                route = '/display_send_approval/' + transaction_uid;
            } else if (approvalType.toLowerCase() === 'receive') {
                route = '/display_receive_approval/' + transaction_uid;
            }
             else {
                // Handle other cases, if any
                console.log('Unknown Approval Type:', approvalType);
                // You can set a default route here or handle it as per your requirement
                route = '/default_route';
            }

            // Redirect to the desired route
            window.location.href = route;
        } else {
            // If no radio button is selected, show an alert
            floatingMessageBox("Please select a radio button before viewing the form");
        }
    });

    // Function to get unique values for each column
    function getUniqueValues(data, column) {
        return [...new Set(data.map(item => item[column]))];
    }

    // Function to populate filter dropdowns
    function populateFilterDropdowns(data){
        const filters = {
            'formNoFilter': 'Transaction_uid', // <-- New filter
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'ApprovalType'
        };

        for (const [filterId, column] of Object.entries(filters)) {
            const select = document.getElementById(filterId);
            if (select) {
                select.innerHTML = '<option value="ALL">ALL</option>'; // Reset options
                const uniqueValues = getUniqueValues(data, column);

                uniqueValues.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    select.appendChild(option);
                });
            }
        }
    }

    // Function to attach filter listeners to dropdowns
    function attachFilterListeners() {
        const filters = {
            'formNoFilter': 'Transaction_uid', // <-- New filter
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'ApprovalType'
        };

        for (const filterId in filters) {
            if (filters.hasOwnProperty(filterId)) {
                $('#' + filterId).change(function(){
                    filterTable();
                });
            }
        }
    }

    // Function to filter the table based on dropdown values
    function filterTable() {
        const filters = {
            'formNoFilter': 'Transaction_uid', // <-- New filter
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'ApprovalType'
        };

        let filteredData = allData;


        for (const [filterId, column] of Object.entries(filters)) {
            const filterValue = $('#' + filterId).val();
       
            if (filterValue !== 'ALL') {
             
                filteredData = filteredData.filter(item => {
                    if (!isNaN(item[column]) && !isNaN(filterValue)) {
                        // If both the item and filter value are numbers, compare them as numbers
                        return parseFloat(item[column]) === parseFloat(filterValue);
                    } else {
                        // If either the item or filter value is not a number, compare them as strings
                        return item[column].toString() === filterValue.toString();
                    }
                });
                
        
              
            }
        }
        
        populateTable(filteredData);
        updateDropdowns(filteredData, filters);
    }

    // Function to update dropdowns based on filtered data
    function updateDropdowns(filteredData, filters) {
        for (const [filterId, column] of Object.entries(filters)) {
            const select = document.getElementById(filterId);
            if (select) {
                // Get current selected value
                const currentValue = select.value;
                
                // Get unique values from filtered data
                const uniqueValues = getUniqueValues(filteredData, column);
                
                // Clear and repopulate dropdown
                select.innerHTML = '<option value="ALL">ALL</option>';
                uniqueValues.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    select.appendChild(option);
                });
                
                // Restore selected value if it still exists in the filtered data
                if (currentValue && currentValue !== 'ALL') {
                    select.value = currentValue;
                }
            }
        }
    }


function  sendTransaction_uid(transaction_uid) {
    var xhr = new XMLHttpRequest();
    
    // Encode the transaction_uid to ensure it's safe for URLs
    var encodedTransactionUID = encodeURIComponent(transaction_uid);
    
    xhr.open("GET", "/send_Transaction_uid?transaction_uid=" + encodedTransactionUID, true);
    
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) { // Check if the request is complete
            if (xhr.status === 200) { // Check if the response is successful
                console.log("Transaction UID sent to Flask: " + transaction_uid);
            } else {
                console.error("Error sending Transaction UID to Flask. Status: " + xhr.status);
            }
        }
    };
    
    xhr.send();
}

function attachSearchListener() {
    $("#myInput").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $("#transactionTable tbody tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });
}
});