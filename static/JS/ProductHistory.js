document.addEventListener("DOMContentLoaded", function() {
    // Function to initialize the autocomplete fields
    function initializeAutocompleteFields() {
        // Fetch autocomplete options from backend 
        fetch('/autocomplete_options')
            .then(response => response.json())
            .then(data => {
                console.log("Autocomplete data received:", data);  // Debug: Autocomplete options

                // Set up autocomplete for each field
                setupAutocomplete("category", data.categories);
                setupAutocomplete("name", data.names);
                setupAutocomplete("make", data.makes);
                setupAutocomplete("model", data.models);
            })
            .catch(error => console.error('Error fetching autocomplete options:', error));
    }

    // Helper function to set up autocomplete on a given input field
    function setupAutocomplete(fieldId, options) {
        const inputElement = document.getElementById(fieldId);
        if (!inputElement) return;

        // Initialize the autocomplete feature
        new Awesomplete(inputElement, {
            list: options,
            minChars: 1,   
            autoFirst: true
        });
    }

    // Call this function when the page is ready
    initializeAutocompleteFields();

    // Function to fetch filtered transaction data based on selected filters
    function fetchTransactionDetails(filters = {}) {
        console.log("Sending filters to backend:", filters);  // Debug: Filters being sent

        fetch('/get_product_transfer_history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        })
        .then(response => {
            console.log("Raw response object:", response);  // Debug: Raw response object
            return response.json();
        })
        .then(data => {
            console.log("Received data from backend:", data);  // Debug: Data received
            // Handle data (populate the table)
            populateTransactionTable(data);
        })
        .catch(error => console.error('Error fetching transaction data:', error));  // Debug: Any error
    }

    // Function to populate the transaction table with fetched data
    function populateTransactionTable(data) {
        const tableBody = document.getElementById("transactionTableBody");
        tableBody.innerHTML = '';  // Clear the table body
    
        // Helper to map condition number to text
        function conditionText(val) {
            if (val === 0 || val === "0") return "Good";
            if (val === 1 || val === "1") return "Not ok";
            if (val === 2 || val === "2") return "Damaged";
            return val;
        }
    
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10">No records found</td></tr>';
        } else {
            let srNo = 1;
            data.forEach(transaction => {
                const details = transaction.transaction_details;
                const products = details.products;
    
                products.forEach(product => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${srNo++}</td>
                        <td>${details.Transaction_uid}</td>
                        <td>${details.InitiationDate}</td>
                        <td>${details.CompletionDate}</td>
                        <td>${details.Source}</td>
                        <td>${details.Sender_uid}</td>
                        <td>${conditionText(product.SenderCondition)}</td>
                        <td>${details.Receiver_uid}</td>
                        <td>${conditionText(product.ReceiverCondition)}</td>
                        <td>${details.Destination}</td>
                    `;
                    tableBody.appendChild(row);
                });
            });
        }
    }
    
    
    // Event listener for the filter form submission
    document.getElementById("submitFilter").addEventListener("click", function(event) {
        event.preventDefault();

        // Collect filter values
        const filters = {
            category: document.getElementById("category").value,
            name: document.getElementById("name").value,
            make: document.getElementById("make").value,
            model: document.getElementById("model").value
        };

        console.log("Filters selected by user:", filters);  // Debug: Filters being sent on form submit

        // Fetch transaction data with selected filters
        fetchTransactionDetails(filters);
    });

    // Initially load all data (without filters)
    fetchTransactionDetails();
});
