let tableData = [];

// Function to fetch data from Flask route using XMLHttpRequest
function fetchData() {
    console.log("Fetching project inventory data...");
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/my_project_dashboard', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                try {
                    var responseData = JSON.parse(xhr.responseText);
                    console.log("Full response data:", responseData);
                    
                    var filteredData = responseData.filtered_data || [];
                    var sessionData = responseData.session_data || {};
                    
                    console.log("Filtered data count:", filteredData.length);
                    console.log("First few records:", filteredData.slice(0, 3));
                    console.log("Session data:", sessionData);
                    
                    if (filteredData.length === 0) {
                        console.log("No data received from server");
                        displayNoDataMessage();
                    } else {
                        displayData(filteredData);
                        populateFilters(filteredData);
                        attachFilterListeners();
                        attachSearchListener();
                    }
                    
                    adjustButtonsVisibility(sessionData);
                } catch (error) {
                    console.error("Error parsing response:", error);
                    displayNoDataMessage("Error loading data. Please try again.");
                }
            } else {
                console.error('Error fetching data:', xhr.statusText);
                displayNoDataMessage("Server error. Please try again later.");
            }
        }
    };
    xhr.send();
}

// Function to display a message when no data is available
function displayNoDataMessage(message = "No inventory data available for your project(s).") {
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${message}</td></tr>`;
}

// Function to get unique values for each column
function getUniqueValues(data, column) {
    const values = data.map(item => item[column]).filter(Boolean);
    return [...new Set(values)];
}

// Function to populate filters with unique values and sort them in ascending order
function populateFilters(data) {
    if (!data || data.length === 0) {
        console.log("No data available to populate filters");
        return;
    }
    
    const filters = {
        'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-condition': 'Condition',
        'filter-project': 'Project',
        'filter-empname': 'OwnerName',  // Changed from 'empname' to match database
        'filter-handoverdate': 'Handover_Date'
    };

    for (const [filterId, column] of Object.entries(filters)) {
        const select = document.getElementById(filterId);
        if (select) {
            select.innerHTML = '<option value="All">All</option>'; // Reset options
            let uniqueValues = getUniqueValues(data, column);

            // Special handling for Condition field
            if (column === 'Condition') {
                uniqueValues = uniqueValues.map(val => getConditionText(val));
            }


            // Sort unique values in ascending order
            uniqueValues.sort();

            uniqueValues.forEach(value => {
                if (value) { // Only add non-empty values
                    const option = document.createElement('option');
                    option.value = value;
                    option.text = value;
                    select.appendChild(option);
                }
            });
            
            console.log(`Populated filter ${filterId} with ${uniqueValues.length} values`);
        }
    }
}

// Function to initialize DataTables
function initializeDataTable() {
    $('#data-table').DataTable({
        lengthChange: false,  // Remove "Show entries" dropdown
        info: false,          // Remove "Showing X to Y of Z entries" label
        paging: false,        // Remove pagination
        searching: false,     // Remove the default search box
        ordering: false,      // Disable column ordering
        autoWidth: false,     // Disable automatic column width calculation
        responsive: true      // Enable responsive design
    });
}

// Function to display data in the table
function getConditionText(val) {
    const conditions = {
        0: 'Good',
        1: 'Not OK',
        2: 'Damaged'
    };
    return conditions[Number(val)] !== undefined ? conditions[Number(val)] : val;
}

// Helper function for truncating remarks (optional, for consistency)
function truncateWithDots(text, length = 8) {
    if (!text || text === '-') return '-';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

function displayData(data) {
    if (!data || data.length === 0) {
        console.log("No data to display");
        displayNoDataMessage();
        return;
    }
    
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    console.log("Displaying data with", data.length, "rows");

    // Updated column mapping to include 'set' and 'addItem_remarks'
    const columnMapping = [
        { display: 'SerialNo', field: null }, // Generated locally
        { display: 'Category', field: 'Category' },
        { display: 'Name', field: 'Name' },
        { display: 'Make', field: 'Make' },
        { display: 'Model', field: 'Model' },
        { display: 'Condition', field: 'Condition' },
        { display: 'Project', field: 'Project' },
        { display: 'Owner', field: 'Owner' },
        { display: 'Handover_Date', field: 'Handover_Date' },
        { display: 'set', field: 'set' }, // <-- Added set column
        { display: 'addItem_remarks', field: 'addItem_remarks' } // <-- Added Remarks column
    ];

    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        columnMapping.forEach(column => {
            const td = document.createElement('td');
            if (column.display === 'SerialNo') {
                td.textContent = index + 1;
            } else if (column.field === 'Project' && !row[column.field] && row['project_id']) {
                td.textContent = row['project_id'];
            } else if (column.field === 'Owner') {
                td.textContent = row['OwnerName'] || row['Owner'] || '';
            } else if (column.field === 'Condition') {
                td.textContent = getConditionText(row[column.field]);
            } else if (column.field === 'addItem_remarks') {
                td.textContent = truncateWithDots(row['addItem_remarks']);
            } else {
                td.textContent = row[column.field] || '';
            }
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });

    // Store the data for future operations
    tableData = data;
    
    console.log("Table populated successfully");
}

// Function to filter the table and update serial numbers
function filterTable() {
    const filters = {
        'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-condition': 'Condition',
        'filter-project': 'Project',
        'filter-empname': 'OwnerName', // Changed from 'empname' to match database
        'filter-handoverdate': 'Handover_Date'
    };

    const tableBody = document.querySelector('#data-table tbody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    let visibleRows = 0;

    rows.forEach(row => {
        let showRow = true;  // Assume the row should be visible

        // Iterate through each filter and apply the filtering logic
        for (const [filterId, column] of Object.entries(filters)) {
            const filterValue = document.getElementById(filterId).value.trim().toLowerCase();
            if (filterValue === 'all') continue; // Skip 'All' filters
            
            const colIndex = columnIndex(column);
            if (colIndex === -1) {
                console.warn(`Column ${column} not found in table structure`);
                continue;
            }
            
            const cellValue = row.cells[colIndex].textContent.trim().toLowerCase();

            // If the value in the column doesn't match the filter, hide the row
            if (filterValue !== cellValue) {
                showRow = false;
                break;
            }
        }

        // Show or hide the row based on whether it passed all filter checks
        if (showRow) {
            row.style.display = ''; // Show the row
            row.cells[0].textContent = ++visibleRows; // Update the serial number
        } else {
            row.style.display = 'none'; // Hide the row
        }
    });

    // Update the dropdowns after filtering
    updateDropdowns(filters);
}

// Helper function to get column index based on column name
function columnIndex(columnName) {
    // Define the columns in the order they appear in the table
    const columns = ['SerialNo', 'Category', 'Name', 'Make', 'Model', 'Condition', 'Project', 'OwnerName', 'Handover_Date'];
    const index = columns.indexOf(columnName);
    
    if (index === -1) {
        console.warn(`Column name not found: ${columnName}`);
        // If Project_1 was requested, use Project instead
        if (columnName === 'Project_1') {
            return columns.indexOf('Project');
        }
    }
    
    return index;
}

// Function to attach filter listeners to dropdowns
function attachFilterListeners() {
    const filterIds = [
        'filter-category', 'filter-name', 'filter-make', 'filter-model',
        'filter-condition', 'filter-project', 'filter-empname', 'filter-handoverdate'
    ];

    filterIds.forEach(filterId => {
        const select = document.getElementById(filterId);
        if (select) {
            // Remove any existing event listener (if previously attached)
            select.removeEventListener('change', handleFilterChange);
            
            // Add a new event listener for change
            select.addEventListener('change', handleFilterChange);
        }
    });
}

// Function to handle filter change event
function handleFilterChange() {
    const select = this;
    
    // Clear selection if "All" is chosen
    if (select.value === 'all') {
        select.selectedIndex = 0; // Reset to the first option
    }

    // Call the filterTable function to filter based on new selection
    filterTable();
}

// Function to attach search listener
function attachSearchListener() {
    $("#myInput").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $("#data-table tbody tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });
}

// Function to adjust buttons visibility based on user role
function adjustButtonsVisibility(sessionData) {
    // Implementation depends on your specific requirements
    console.log("Adjusting button visibility based on session data:", sessionData);
}

// Function to update dropdowns based on visible rows and sort them
function updateDropdowns(activeFilters) {
    const filters = {
        'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-condition': 'Condition',
        'filter-project': 'Project',
        'filter-empname': 'OwnerName', // Changed from 'empname' to match database
        'filter-handoverdate': 'Handover_Date'
    };

    for (const [filterId, column] of Object.entries(filters)) {
        const select = document.getElementById(filterId);
        if (!select) continue;
        
        const uniqueValues = new Set(['All']);

        // If the user has selected a value, store it to set it back later
        const currentValue = select.value;

        const visibleRows = Array.from(document.querySelectorAll('#data-table tbody tr'))
            .filter(row => row.style.display !== 'none');

        visibleRows.forEach(row => {
            const cellValue = row.cells[columnIndex(column)].textContent;
            if (cellValue) {
                uniqueValues.add(cellValue);
            }
        });

        // Sort unique values in ascending order
        const sortedUniqueValues = [...uniqueValues].sort();

        // Populate dropdown with unique values
        select.innerHTML = '';
        sortedUniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = value;
            select.appendChild(option);
        });

        // Ensure the current selection is retained
        if (activeFilters && activeFilters[filterId] === column) {
            // If the active filter is selected, set it back
            select.value = currentValue;
        }
    }
}

// Call fetchData when the page loads
document.addEventListener('DOMContentLoaded', fetchData);