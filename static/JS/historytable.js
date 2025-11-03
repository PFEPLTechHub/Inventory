$(document).ready(function(){
    var allData;

    // Make the AJAX request with error handling
    $.getJSON('/transaction_history_table')
        .done(function(data) {
            console.log("this is the data,", data)
            allData = data.filtered_data;
            var sessionData = data.session_data;

            console.log('this is data', allData);

            adjustButtonsVisibility(sessionData);

            populateTable(allData);
            populateFilterDropdowns(allData);
            attachFilterListeners();
        })
        .fail(function(jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error("Request Failed: " + err);
        })
        .always(function() {
            console.log("Request completed");
        });

    // Function to populate table with data
    function populateTable(data){
        var i = 0;
        $('#transactionData').empty();
        $.each(data, function(index, transaction){
            // Convert numeric status to human-readable
            let statusText = '';
            if (transaction.Status === 1 || transaction.Status === '1') {
                statusText = 'Approved';
            } else if (transaction.Status === 2 || transaction.Status === '2') {
                statusText = 'Disapproved';
            } else {
                statusText = 'Pending';
            }
            $('#transactionTable tbody').append('<tr>' +
                '<td><input type="radio" name="selection" class="radioButton" data-formid="'+ transaction.Transaction_uid+'"></td>'+
                '<td>' + (++i) + '</td>' +
                '<td>' + transaction.Transaction_uid + '</td>' +
                '<td>' + transaction.EwayBillNo + '</td>' +
                '<td>' + (transaction.SourceName || transaction.Source) + '</td>' +
                '<td>' + (transaction.DestinationName || transaction.Destination) + '</td>' +
                '<td>' + (transaction.SenderName || '') + '</td>' +
                '<td>' + (transaction.ReceiverName || '') + '</td>' +
                '<td>' + transaction.InitiationDate + '</td>' +
                '<td>' + transaction.TransactionType + '</td>' +
                '<td>' + statusText + '</td>' +
                '</tr>');
        });
    }

    // Event listener for view button
    document.getElementById("viewButton").addEventListener("click", function() {
        var table = document.getElementById("transactionTable");
        var selectedRow;

        // Check if at least one radio button is selected
        var atLeastOneSelected = false;
        for (var i = 0; i < table.rows.length; i++) {
            var radioButton = table.rows[i].querySelector("input[type='radio']");
            if (radioButton && radioButton.checked) {
                selectedRow = table.rows[i];
                atLeastOneSelected = true;
                break;
            }
        }

        // If at least one radio button is selected, proceed
        if (atLeastOneSelected) {
            var transaction_uid = selectedRow.cells[2].textContent; // Change index if needed

            // Send the form ID to the Flask route using XMLHttpRequest
            send_Transaction_uid(transaction_uid);

            // Redirect to the desired route
            window.location.href = "/transaction_history_form_data/" + transaction_uid;
        } else {
            // If no radio button is selected, show an alert
            floatingMessageBox("Please select a form before proceeding");
        }
    });


    // Function to get unique values for each column
    function getUniqueValues(data, column) {
        return [...new Set(data.map(item => item[column]))];
    }

    // Function to populate filter dropdowns
    function populateFilterDropdowns(data){
        const filters = {
            'formIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'SourceName',
            'destinationFilter': 'DestinationName',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'TransactionType',
            'statusFilter': 'Status'

        };

         for (const [filterId, column] of Object.entries(filters)) {
        const select = document.getElementById(filterId);
        if (select) {
            select.innerHTML = '<option value="ALL">ALL</option>'; // Reset options

            let uniqueValues = getUniqueValues(data, column);

            // For status filter, convert to text labels
            if (column === 'Status') {
                uniqueValues = [...new Set(data.map(item => getStatusText(item.Status)))];
            }

            uniqueValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.text = value;
                select.appendChild(option);
            });
            }
        }
    }

    // Function to attach filter listeners to dropdowns
    function attachFilterListeners() {
        const filters = {
            'formIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'Sender',
            'receiverFilter': 'Receiver',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'TransactionType',
            'statusFilter': 'Status'
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
            'formIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'SourceName',
            'destinationFilter': 'DestinationName',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'TransactionType',
            'statusFilter': 'Status'
        };

        let filteredData = allData;

       for (const [filterId, column] of Object.entries(filters)) {
        const filterValue = $('#' + filterId).val();
        if (filterValue !== 'ALL') {
            filteredData = filteredData.filter(item => {
                if (column === 'Status') {
                    return getStatusText(item[column]) === filterValue;
                } else {
                    return (item[column] || '').toString() === filterValue.toString();
                }
            });
            }
        }

        populateTable(filteredData);
        // Optionally, update dropdowns based on filtered data
        // updateDropdowns(filteredData, filters);
    }
});

    // Function to send form ID to Flask route
    function send_Transaction_uid(transaction_uid) {
        var xhr = new XMLHttpRequest(); 
        xhr.open("GET", "/send_Transaction_uid?transaction_uid=" + transaction_uid, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log("transaction_uid sent to Flask: " + transaction_uid);
            }
        };
        xhr.send();
    }

    // Search bar logic
$("#myInput").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#transactionTable tbody tr").filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
});

// Function to map status to text
function getStatusText(status) {
    if (status === 1 || status === "1") return "Approved";
    if (status === 2 || status === "2") return "Disapproved";
    return "Pending";
}

