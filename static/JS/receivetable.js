$(document).ready(function() {
    var allData;

    // Make the AJAX request with error handling
    $.getJSON('/receive_items_table_data')
        .done(function(data) {
            allData = data.filtered_data; // Use the filtered_data from the response
            console.log('this is dataaaaaa', allData);

            // Access the session_data property
            var sessionData = data.session_data;

            adjustButtonsVisibility(sessionData);

            //Pass the filtered data to the functions
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

   function populateTable(data) {
    var i = 0;
    // Clear existing table rows first
    $('#transactionTable tbody').empty();
    $.each(data, function(index, transaction) {
        $('#transactionTable tbody').append('<tr>' +
            '<td><input type="radio" name="selection" class="radioButton" data-formid="' + transaction.Transaction_uid + '"></td>' +
            '<td>' + (++i) + '</td>' +
            '<td>' + transaction.Transaction_uid + '</td>' +
            '<td>' + transaction.EwayBillNo + '</td>' +
            '<td>' + (transaction.SourceName || transaction.Source) + '</td>' +
            '<td>' + (transaction.DestinationName || transaction.Destination) + '</td>' +
            '<td>' + (transaction.SenderName || '-') + '</td>' +
            '<td>' + (transaction.ReceiverName || '-') + '</td>' +
            '<td>' + transaction.InitiationDate + '</td>' +
            '</tr>');
        console.log("Transaction object:", transaction);
    });
}


    function getUniqueValues(data, column) {
        return [...new Set(data.map(item => item[column]))];
    }

    function populateFilterDropdowns(data) {
        const filters = {
            'transactionUIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate'
        };

        for (const [filterId, column] of Object.entries(filters)) {
            const select = document.getElementById(filterId);
            if (select) {
                select.innerHTML = '<option value="ALL">ALL</option>'; // Reset options
                const uniqueValues = getUniqueValues(data, column);

                uniqueValues.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.text = value;
                    select.appendChild(option);
                });
            }
        }
    }

    function attachFilterListeners() {
        const filters = {
            'transactionUIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate'
        };

        for (const filterId in filters) {
            if (filters.hasOwnProperty(filterId)) {
                $('#' + filterId).change(function() {
                    filterTable();
                });
            }
        }
    }

    function filterTable() {
        const filters = {
            'transactionUIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'SenderName',
            'receiverFilter': 'ReceiverName',
            'doiFilter': 'InitiationDate'
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
    }

    document.getElementById("viewButton").addEventListener("click", function() {
        var table = document.getElementById("transactionTable");
        var selectedRow;

        // Check if at least one radio button is selected
        var radioButtons = document.querySelectorAll("input[type='radio']");
        var atLeastOneSelected = false;
        for (var i = 0; i < radioButtons.length; i++) {
            if (radioButtons[i].checked) {
                atLeastOneSelected = true;
                break;
            }
        }

        // If at least one radio button is selected, proceed
        if (atLeastOneSelected) {
            // Iterate over the table rows
            for (var i = 0; i < table.rows.length; i++) {
                // Check if the radio button in this row is selected
                var radioButton = table.rows[i].querySelector("input[type='radio']");
                if (radioButton && radioButton.checked) {
                    selectedRow = table.rows[i];
                    break; // Exit loop if a selected row is found
                }
            }

            // If a selected row is found, retrieve data from the formid column (second column)
            if (selectedRow) {
                var transaction_uid = selectedRow.cells[2].textContent.trim(); // Get and trim the transaction_uid
                console.log("Selected transaction_uid:", transaction_uid); // Debug log

                if (!transaction_uid) {
                    floatingMessageBox("Invalid transaction ID", 'red');
                    return;
                }

                // Send the form ID to the Flask route using XMLHttpRequest
                sendTransaction_uid(transaction_uid);

                // Redirect to the desired route with transaction_uid
                window.location.href = "/receive_form_data/" + encodeURIComponent(transaction_uid);
            } else {
                console.log('No formid selected');
                floatingMessageBox("No form selected", 'red');
            }
        } else {
            floatingMessageBox("Please select a radio button before viewing the form", 'red');
        }
    });

    // Function to send form ID to Flask route
    function  sendTransaction_uid(transaction_uid) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/receive_Transaction_uid?transaction_uid=" + transaction_uid, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log("Form ID sent to Flask: " + formID);
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
    
    // Refresh table data when page becomes visible (e.g., when returning from receive form)
    $(document).on('visibilitychange', function() {
        if (!document.hidden) {
            // Page is now visible, refresh the data
            console.log('Page became visible, refreshing receive table data...');
            refreshTableData();
        }
    });
    
    // Function to refresh table data
    function refreshTableData() {
        $.getJSON('/receive_items_table_data')
            .done(function(data) {
                allData = data.filtered_data;
                console.log('Refreshed data:', allData);
                
                // Access the session_data property
                var sessionData = data.session_data;
                adjustButtonsVisibility(sessionData);
                
                // Update the table with fresh data
                populateTable(allData);
                populateFilterDropdowns(allData);
                attachFilterListeners();
            })
            .fail(function(jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                console.error("Refresh Request Failed: " + err);
            });
    }
    
    // Function to adjust button visibility based on user type
    // function adjustButtonsVisibility(sessionData) {
    //     if (sessionData && sessionData.TypeOfAccount) {
    //         const userType = sessionData.TypeOfAccount;
    //         console.log('User type:', userType);
    //         
    //         // You can add specific logic here to show/hide buttons based on user type
    //         // For now, we'll just log the user type
    //     }
    // }
});
