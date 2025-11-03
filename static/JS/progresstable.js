$(document).ready(function() {
    var allData;

    // First get all transactions
    $.ajax({
        url: '/get_all_transactions',
        type: 'GET',
        contentType: 'application/json',
        success: function(data) {
            console.log("Data received:", data);

            if (data.session_data) {
                console.log("This is the userData", data.session_data);
            }

            var sessionData = data.session_data;
            allData = data.filtered_data || data;

            if (!Array.isArray(allData)) {
                console.error("Expected allData to be an array, but got:", allData);
                return;
            }

            populateTable(allData);
            populateFilterDropdowns(allData);
            attachFilterListeners();
            adjustButtonsVisibility(sessionData);

            // Sidebar updates
            if (data.session_data) {
                if (document.getElementById("sidebarUserName")) {
                    document.getElementById("sidebarUserName").textContent = data.session_data.Name;
                }
                if (document.getElementById("sidebarUserEmail")) {
                    document.getElementById("sidebarUserEmail").textContent = data.session_data.MailID;
                }
            }
        },
        error: function(jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error("Request Failed: " + err);
            $('#transactionTable tbody').html('<tr><td colspan="10">Failed to load transaction data. Please try again later.</td></tr>');
        }
    });

    function populateTable(data) {
        $('#transactionData').empty();
        var i = 0;
        $.each(data, function(index, transaction) {
            $('#transactionTable tbody').append('<tr>' +
                '<td><input type="radio" name="selection" class="radioButton" data-formid="'+ transaction.Transaction_uid +'"></td>'+
                '<td>' + (++i) + '</td>' +
                '<td>' + transaction.Transaction_uid + '</td>' +
                '<td>' + (transaction.EwayBillNo || '') + '</td>' +
                '<td>' + (transaction.Source || '') + '</td>' +
                '<td>' + (transaction.Destination || '') + '</td>' +
                '<td>' + (transaction.SenderName || '') + '</td>' +
                '<td>' + (transaction.ReceiverName || '') + '</td>' +
                '<td>' + transaction.InitiationDate + '</td>' +
                '<td class="notForAdmin">' + transaction.TransactionType + '</td>' +
                '</tr>');
        });
    }

    function getUniqueValues(data, column) {
        return [...new Set(data.map(item => {
            switch(column) {
                case 'Source': return item.Source;
                case 'Destination': return item.Destination;
                case 'Sender_uid': return item.SenderName;
                case 'Receiver_uid': return item.ReceiverName;
                default: return item[column];
            }
        }))];
    }

    function populateFilterDropdowns(data) {
        const filters = {
            'formIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'Sender_uid',
            'receiverFilter': 'Receiver_uid',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'TransactionType'
        };
        for (const [filterId, column] of Object.entries(filters)) {
            const select = document.getElementById(filterId);
            if (select) {
                select.innerHTML = '<option value="ALL">ALL</option>';
                const uniqueValues = getUniqueValues(data, column);
                uniqueValues.forEach(value => {
                    if (value) {
                        const option = document.createElement('option');
                        option.value = value;
                        option.text = value;
                        select.appendChild(option);
                    }
                });
            }
        }
    }

    function attachFilterListeners() {
        const filters = {
            'formIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'Sender_uid',
            'receiverFilter': 'Receiver_uid',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'TransactionType'
        };

        for (const filterId in filters) {
            if (filters.hasOwnProperty(filterId)) {
                $('#' + filterId).on('change', function() {
                    console.log("Dropdown changed:", filterId, "=>", $(this).val());
                    filterTable();
                });
            }
        }
    }

    function filterTable() {
        const filters = {
            'formIDFilter': 'Transaction_uid',
            'ewayFilter': 'EwayBillNo',
            'sourceFilter': 'Source',
            'destinationFilter': 'Destination',
            'senderFilter': 'Sender_uid',
            'receiverFilter': 'Receiver_uid',
            'doiFilter': 'InitiationDate',
            'approvalFilter': 'TransactionType'
        };

        if (!Array.isArray(allData)) {
            console.error("allData is not ready or not an array:", allData);
            return;
        }

        let filteredData = allData;

        for (const [filterId, column] of Object.entries(filters)) {
            const filterValue = $('#' + filterId).val();
            console.log(`Filtering by ${column}: ${filterValue}`);
            if (filterValue !== 'ALL') {
                filteredData = filteredData.filter(item => {
                    let itemValue;
                    switch (column) {
                        case 'Source': itemValue = item.Source; break;
                        case 'Destination': itemValue = item.Destination; break;
                        case 'Sender_uid': itemValue = item.SenderName; break;
                        case 'Receiver_uid': itemValue = item.ReceiverName; break;
                        default: itemValue = item[column];
                    }

                    const result = (!isNaN(itemValue) && !isNaN(filterValue)) 
                        ? parseFloat(itemValue) === parseFloat(filterValue) 
                        : itemValue && itemValue.toString() === filterValue.toString();

                    console.log(`\tComparing "${itemValue}" with "${filterValue}" → ${result}`);
                    return result;
                });
            }
        }

        console.log("Filtered data count:", filteredData.length);
        populateTable(filteredData);
    }

    $('#viewButton').on('click', function() {
        var table = document.getElementById("transactionTable");
        var selectedRow;
        for (var i = 0; i < table.rows.length; i++) {
            var radioButton = table.rows[i].querySelector("input[type='radio']");
            if (radioButton && radioButton.checked) {
                selectedRow = table.rows[i];
                break;
            }
        }

        if (selectedRow) {
            var transaction_uid = selectedRow.cells[2].textContent;
            send_Transaction_uid(transaction_uid);
            window.location.href = "/display_transaction_progess/" + transaction_uid;
        } else {
            floatingMessageBox("Please select a form before proceeding");
        }
    });

    function send_Transaction_uid(transaction_uid) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/send_Transaction_uid?transaction_uid=" + transaction_uid, true);
        console.log('Sending transaction_uid to Flask:', transaction_uid);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log("transaction_uid sent to Flask successfully");
            }
        };
        xhr.send();
    }

    $("#myInput").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $("#transactionTable tbody tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });
});
