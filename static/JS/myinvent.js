let fullTableData = []; // Store the original fetched data

// Function to fetch data from Flask route using XMLHttpRequest
function fetchData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/my_invent_dashboard', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                var responseData = JSON.parse(xhr.responseText);
                fullTableData = responseData.filtered_data; // Store original data
                var sessionData = responseData.session_data;

                console.log("Filtered data length (initial):", fullTableData ? fullTableData.length : 0);
                console.log("First data item (initial):", fullTableData && fullTableData.length > 0 ? fullTableData[0] : "No data");
                console.log(sessionData);

                displayData(fullTableData); // Display all original data initially
                updateAllFilterDropdowns(fullTableData); // Populate filters based on original data
                attachFilterListeners();
                attachSearchListener();
                adjustButtonsVisibility(sessionData);

            } else {
                console.error('Error fetching data:', xhr.statusText);
            }
        }
    };
    xhr.send();
}


// Function to get unique values for each column
function getUniqueValues(data, column) {
    return [...new Set(data.map(item => getCellValue(item, column)))];
}

// Add this helper function to get the actual value for filtering and display
function getCellValue(item, column) {
    if (column === 'Condition') {
        return getConditionText(item[column]);
    } else if (column === 'ProjectName') {
        return item['ProjectName'] || item['project_id'] || '';
    } else if (column === 'OwnerName') {
        return item['OwnerName'] || item['Owner'] || '';
    } else {
        return item[column] || ''; // Return empty string for null/undefined values
    }
}

// Function to initialize DataTables (or get existing instance)
let dataTableInstance = null; // Global variable to store DataTable instance
function initializeDataTable() {
    if (dataTableInstance !== null) {
        dataTableInstance.destroy();
    }
    dataTableInstance = $('#data-table').DataTable({
        lengthChange: false,
        info: false,
        paging: false,
        searching: false,
        ordering: false,
        autoWidth: false,
        responsive: true
    });
}

// Add this helper function
function getConditionText(val) {
    const conditions = {
        0: 'Good',
        1: 'Not OK',
        2: 'Damaged'
    };
    return conditions[Number(val)] !== undefined ? conditions[Number(val)] : val;
}


// Add this helper function for truncating remarks
function truncateWithDots(text, length = 8) {
    if (!text || text === '-') return '-';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// Function to display data in the table
function displayData(data) {
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows (or use DataTable API for this)

    // Define the columns to display (remove ProductSerial/ProductID from UI)
    const desiredColumns = ['SerialNo', 'Category', 'Name', 'Make', 'Model', 'ProductSerial', 'Condition', 'Project', 'empname', 'Handover_Date', 'set', 'addItem_remarks'];

    // Clear existing data and add new data to DataTable instance
    if (dataTableInstance) {
        dataTableInstance.clear();
        data.forEach((row, index) => {
            const rowData = [];
            desiredColumns.forEach(column => {
                if (column === 'SerialNo') {
                    rowData.push(index + 1);
                } else if (column === 'Project') {
                    rowData.push(getCellValue(row, 'ProjectName'));
                } else if (column === 'empname') {
                    rowData.push(getCellValue(row, 'OwnerName'));
                } else if (column === 'Condition') {
                    rowData.push(getCellValue(row, 'Condition'));
                } else if (column === 'addItem_remarks') {
                    rowData.push(truncateWithDots(row['addItem_remarks']));
                } else {
                    rowData.push(getCellValue(row, column));
                }
            });
            dataTableInstance.row.add(rowData);
        });
        dataTableInstance.draw();
    }
}

// Function to filter the table and update serial numbers
function filterTable() {
    const filters = {
        'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-productserial': 'ProductSerial',
        'filter-condition': 'Condition',
        'filter-project': 'ProjectName',   
        'filter-empname': 'OwnerName',     
        'filter-handoverdate' : 'Handover_Date'
    };

    let currentFilteredData = [...fullTableData]; // Start with full data for filtering
    console.log("filterTable: Initial currentFilteredData length:", currentFilteredData.length);

    // Apply filters
    for (const [filterId, column] of Object.entries(filters)) {
        const filterValue = document.getElementById(filterId).value.trim();
        console.log(`filterTable: Current filter - Column: '${column}', Selected Value: '${filterValue}'`);
        console.log(`filterTable: Current data length before filter for '${column}': ${currentFilteredData.length}`);

        if (filterValue !== '') { // Check against empty string now
            currentFilteredData = currentFilteredData.filter(item => {
                let itemValue = getCellValue(item, column);
                return itemValue.trim().toLowerCase() === filterValue.toLowerCase();
            });
            console.log(`filterTable: Current data length after filter for '${column}': ${currentFilteredData.length}`);
        }
    }

    console.log("filterTable: Final currentFilteredData length:", currentFilteredData.length);
    displayData(currentFilteredData); // Display the filtered data
    updateAllFilterDropdowns(currentFilteredData); // Update dropdowns based on the filtered data
}



// Helper function to get column index based on column name
function columnIndex(columnName) {
    const columns = ['SerialNo', 'Category', 'Name', 'Make', 'Model', 'ProductSerial', 'Condition', 'Project', 'empname', 'Handover_Date', 'set', 'addItem_remarks'];
    return columns.indexOf(columnName);
}

// Function to update dropdowns based on the provided data and sort them
function updateAllFilterDropdowns(data) {
    console.log("updateAllFilterDropdowns: Data received length:", data.length);
    const filters = {
       'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-productserial': 'ProductSerial',
        'filter-condition': 'Condition',
        'filter-project': 'ProjectName',   
        'filter-empname': 'OwnerName',     
        'filter-handoverdate' : 'Handover_Date'
    };

    for (const [filterId, column] of Object.entries(filters)) {
        const select = document.getElementById(filterId);
        const uniqueValues = new Set(['']);  // Initialize with empty string for 'All'

        const currentValue = select.value;
        console.log(`updateAllFilterDropdowns: Processing filter for '${column}', current selected value: '${currentValue}'`);
        console.log(`updateAllFilterDropdowns: Before clearing, '${column}' dropdown options length: ${select.options.length}`);

        // Collect values from the provided 'data'
        data.forEach(item => {
            let itemValue = getCellValue(item, column);
            if (itemValue) { // Only add if value exists
                uniqueValues.add(itemValue);
            }
        });
        console.log(`updateAllFilterDropdowns: For filter '${column}', collected unique values:`, [...uniqueValues]);

        const sortedUniqueValues = [...uniqueValues].sort();

        select.innerHTML = '';  // Clear the existing options
        console.log(`updateAllFilterDropdowns: After clearing, '${column}' dropdown options length: ${select.options.length}`);

        sortedUniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = value === '' ? 'All' : value; // Display 'All' for empty value
            select.appendChild(option);
        });
        console.log(`updateAllFilterDropdowns: After repopulating, '${column}' dropdown options length: ${select.options.length}`);

        // Ensure the current selection is retained
        if (currentValue && sortedUniqueValues.includes(currentValue)) {
            select.value = currentValue;
        } else {
            select.value = ''; // Fallback to empty string for 'All' if the current value is no longer valid
        }
    }
}

// Function to attach filter listeners to dropdowns
function attachFilterListeners() {
    const filterIds = [
        'filter-category', 'filter-name', 'filter-make', 'filter-model',
        'filter-productserial', 'filter-condition', 'filter-project', 'filter-empname', 'filter-handoverdate'
    ];

    filterIds.forEach(filterId => {
        const select = document.getElementById(filterId);

        // Remove any existing event listener (if previously attached)
        select.removeEventListener('change', handleFilterChange);

        // Add a new event listener for change
        select.addEventListener('change', handleFilterChange);
    });
}

// Function to handle filter change event
function handleFilterChange() {
    filterTable(); // filterTable will now handle displaying data and updating dropdowns
}



// Function to attach search listener to search bar and update serial numbers dynamically
function attachSearchListener() {
    $("#myInput").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        var visibleRows = 0;

        $("#data-table tbody tr").filter(function() {
            var isVisible = $(this).text().toLowerCase().indexOf(value) > -1;
            $(this).toggle(isVisible);

            // If the row is visible, update the serial number
            if (isVisible) {
                $(this).find('td:first').text(++visibleRows); // Update serial number in the first column
            }
        });
    });
}


// Call the fetchData function when the page loads
window.onload = function() {
    initializeDataTable(); // Initialize DataTable once
    fetchData();
};