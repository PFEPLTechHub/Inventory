let tableData = [];
let toa;

// Function to fetch data from Flask route using XMLHttpRequest
function fetchData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/invent_dashboard', true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                var responseData = JSON.parse(xhr.responseText);
                console.log("fetchData: Raw responseData:", responseData); // Re-added debug log
                var filteredData = responseData.filtered_data;
                console.log("fetchData: Processed filteredData:", filteredData); // Re-added debug log
                var sessionData = responseData.session_data;
                toa = sessionData.TypeOfAccount;
                
                tableData = filteredData; // Store the original fetched data
                displayData(tableData); // Display all data initially
                populateFilters(tableData); // Populate filters with all data
                attachFilterListeners();
                attachSearchListener();
                adjustButtonsVisibility(sessionData);
                filterTable(); // Call filterTable after initial data load and filter population
            } else {
                console.error('Error fetching data:', xhr.statusText);
            }
        }
    };
    xhr.send();
} // End of fetchData

// Function to get unique values for each column
function getUniqueValues(data, column) {
    if (column === 'empname') {
        return [...new Set(data.map(item => item.OwnerName || item.Owner).filter(Boolean))];
    }
    if (column === 'Project') {
        return [...new Set(data.map(item => item.ProjectName || item.project_id).filter(Boolean))];
    }
    if (column === 'Condition') {
    return [...new Set(
        data.map(item => getConditionText(item.Condition)).filter(Boolean)
    )];
}
    // For ProductSerial and other direct columns
    return [...new Set(data.map(item => item[column]).filter(Boolean))];
} // End of getUniqueValues

// Add this helper function to get the actual value for filtering and display consistently
function getCellValue(item, column) {
    if (column === 'empname') {
        return item.OwnerName || item.Owner || '';
    } else if (column === 'Project') {
        return item.ProjectName || item.project_id || '';
    } else if (column === 'Condition') {
        return getConditionText(item.Condition);
    } else {
        return item[column] || ''; // Return empty string for null/undefined values
    }
} // End of getCellValue

// Function to populate filters with unique values and sort them in ascending order
function populateFilters(data) {
    // Initial population of all dropdowns using the full dataset
    updateAllFilterDropdowns(data);
} // End of populateFilters

// Function to update dropdowns based on the provided data and sort them
function updateAllFilterDropdowns(data) {
    const filters = {
        'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-productserial': 'ProductSerial',
        'filter-condition': 'Condition',
        'filter-project': 'Project',
        'filter-empname': 'empname',
        'filter-handoverdate': 'Handover_Date',
        'filter-set': 'set'
    };

    for (const [filterId, column] of Object.entries(filters)) {
        const select = document.getElementById(filterId);
        const uniqueValues = new Set(['All']);  // Initialize with 'All' option

        const currentValue = select.value; // Store current selection

        // Collect values from the provided 'data'
        data.forEach(item => {
            let itemValue = getCellValue(item, column);
            if (itemValue) { // Only add if value exists
                uniqueValues.add(itemValue);
            }
        });

        const sortedUniqueValues = [...uniqueValues].sort();

        select.innerHTML = '<option value="All">All</option>';  // Clear and add 'All' option
        sortedUniqueValues.forEach(value => {
            if (value !== 'All') { // Avoid adding 'All' twice
                const option = document.createElement('option');
                option.value = value;
                option.text = value;
                select.appendChild(option);
            }
        });

        // Ensure the current selection is retained
        if (currentValue && sortedUniqueValues.includes(currentValue)) {
            select.value = currentValue;
        } else {
            select.value = 'All'; // Fallback to 'All' if the current value is no longer valid
        }
    }
} // End of updateAllFilterDropdowns

// Function to initialize DataTables
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
} // End of initializeDataTable

// Add this helper function for truncating remarks
function truncateWithDots(text, length = 8) {
    if (!text || text === '-') return '-';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
} // End of truncateWithDots

// Function to delete an item by sending the ProductID to Flask
function deleteItem(productId) {
    $.ajax({
        url: '/delete_item',  // Flask route for deleting item
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ product_id: productId }),
        success: function (response) {
            alert(response.message);  // Success message from Flask
            fetchData(); // Reload table after deletion
        },
        error: function (xhr, status, error) {
            alert('Error deleting item: ' + xhr.responseText);  // Show error message
        }
    });
} // End of deleteItem

// Function to display data and add rows dynamically
function displayData(data) {

    const tableBody = document.querySelector('#data-table tbody');

    // Clear existing table rows before adding new data
    tableBody.innerHTML = '';
    
    // Check if data is valid
    if (!data || data.length === 0) {
        console.log("displayData: No data to display"); // Re-added debug log
        // Display no data message
        const noDataRow = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.textContent = 'No data available in table';
        noDataCell.colSpan = 13; // Corrected to 13: 12 data columns + 1 action column
        noDataCell.style.textAlign = 'center';
        noDataRow.appendChild(noDataCell);
        tableBody.appendChild(noDataRow);
        // If DataTables is initialized, ensure it's cleared or redrawn even with no data
        if (dataTableInstance) {
            dataTableInstance.clear().draw();
        }
        return;
    }

    // Add 'set' and 'addItem_remarks' before the Action column
    // The order here must match your HTML table header!
    const desiredColumns = [
        'SerialNo', 'Category', 'Name', 'Make', 'Model', 'ProductSerial', 'Condition', 'Project', 'empname', 'Handover_Date', 'set', 'addItem_remarks'
    ];
    console.log("displayData: Data received for display:", data); // Re-added debug log

    // Clear existing data and add new data to DataTable instance
    if (dataTableInstance) {
        dataTableInstance.clear();
        data.forEach((row, index) => {
            const rowData = [];
            desiredColumns.forEach(column => {
                if (column === 'SerialNo') {
                    rowData.push(index + 1);
                } else if (column === 'addItem_remarks') {
                    rowData.push(truncateWithDots(row['addItem_remarks']));
                } else if (column === 'set') {
                    rowData.push(row['set'] || '-');
                } else {
                    // Use getCellValue for all other data columns
                    rowData.push(getCellValue(row, column));
                }
            });
            // Add Action buttons as the last cell
            console.log('Creating button for ProductID:', row.ProductID);
            const actionButtons = `
                <button class="btn btn-warning edit-button" data-product-id="${row.ProductID || ''}">Edit</button>
            `;
            rowData.push(actionButtons);
            // Store the ProductID in the row data for later access
            rowData._productId = row.ProductID;
            dataTableInstance.row.add(rowData);
        });
        dataTableInstance.draw();

        // Re-attach event listeners for edit buttons after DataTables redraw
        $('#data-table tbody').off('click', '.edit-button').on('click', '.edit-button', function() {
            const rowElement = $(this).closest('tr');
            editRow(rowElement[0]);
        });

    }
} // End of displayData

// Function to enable editing for Category, Name, Make, Model columns
function editRow(row) {
    const cells = row.querySelectorAll('td');
    const isEditing = row.classList.contains('editing');

    if (isEditing) {
        // Save changes when "Save" is clicked
        saveRow(row);
    } else {
        // Enable editing for the required columns (indices adjusted for ProductSerial)
        cells[1].setAttribute('contenteditable', 'true'); // Category
        cells[2].setAttribute('contenteditable', 'true'); // Name
        cells[3].setAttribute('contenteditable', 'true'); // Make
        cells[4].setAttribute('contenteditable', 'true'); // Model
        cells[5].setAttribute('contenteditable', 'true'); // ProductSerial
        cells[10].setAttribute('contenteditable', 'true'); // Set (index changed from 9 to 10)

        row.classList.add('editing'); // Mark as being edited

        // Add Save, Delete, and Cancel buttons (in the last column, which is index 12 based on desiredColumns + Action)
        const actionTd = cells[cells.length - 1]; // Last cell is always the action column
        actionTd.innerHTML = ''; // Clear existing actions
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'btn btn-success';
        saveButton.addEventListener('click', () => saveRow(row));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'btn btn-danger';
        // Get ProductID from DataTable row data
        const rowIndex = $(row).index();
        const rowData = dataTableInstance.row(rowIndex).data();
        const productId = rowData._productId;
        console.log('Row index:', rowIndex);
        console.log('Row data:', rowData);
        console.log('ProductID from row data:', productId);
        deleteButton.addEventListener('click', () => deleteItem(productId));

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'btn btn-secondary';
        cancelButton.addEventListener('click', () => cancelEdit(row));

        actionTd.appendChild(saveButton);
        actionTd.appendChild(deleteButton);
        actionTd.appendChild(cancelButton);
    }
} // End of editRow

// Function to save the edited row
function saveRow(row) {
    const cells = row.querySelectorAll('td');
    const updatedData = {
        Category: cells[1].textContent.trim() || null,
        Name: cells[2].textContent.trim() || null,
        Make: cells[3].textContent.trim() || null,
        Model: cells[4].textContent.trim() || null,
        ProductSerial: cells[5].textContent.trim() || null, // Added ProductSerial
        set: cells[10].textContent.trim() || null  // Index changed from 9 to 10
    };

    // Get ProductID from DataTable row data
    const rowIndex = $(row).index();
    const rowData = dataTableInstance.row(rowIndex).data();
    const productId = rowData._productId;
    
    $.ajax({
        url: '/save_item', // Flask route to save the updated item
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ product_id: productId, updated_data: updatedData }),
        success: function (response) {
            alert(response.message); // Success message from Flask
            fetchData(); // Reload table after saving
        },
        error: function (xhr, status, error) {
            alert('Error saving item: ' + xhr.responseText); // Show error message
        }
    });
   row.classList.remove('editing'); // Remove editing state
} // End of saveRow

// Function to cancel editing and revert changes
function cancelEdit(row) {
    row.classList.remove('editing'); // Remove editing state
    fetchData(); // Reload the data to revert changes
} // End of cancelEdit

// Function to filter the table and update serial numbers
function filterTable() {
    const filters = {
        'filter-category': 'Category',
        'filter-name': 'Name',
        'filter-make': 'Make',
        'filter-model': 'Model',
        'filter-productserial': 'ProductSerial',
        'filter-condition': 'Condition',
        'filter-project': 'Project',
        'filter-empname': 'empname',
        'filter-handoverdate': 'Handover_Date',
        'filter-set': 'set'
    };

    let currentFilteredData = [...tableData]; // Start with a copy of the original data

    // First, apply all filters to get the final filtered dataset
    for (const [filterId, column] of Object.entries(filters)) {
        const filterValue = document.getElementById(filterId).value.trim();
        if (filterValue !== 'All') {
            currentFilteredData = currentFilteredData.filter(item => {
                let itemValue = getCellValue(item, column);
                return itemValue && itemValue.trim().toLowerCase() === filterValue.toLowerCase();
            });
        }
    }

    displayData(currentFilteredData); // Display the fully filtered data
    updateAllFilterDropdowns(currentFilteredData); // Update dropdowns based on the fully filtered data
} // End of filterTable

// Helper function to find the column index based on column name
function columnIndex(columnName) {
    const columns = ['SerialNo', 'Category', 'Name', 'Make', 'Model', 'ProductSerial', 'Condition', 'Project', 'empname', 'Handover_Date', 'set', 'addItem_remarks'];
    return columns.indexOf(columnName);
} // End of columnIndex

// Function to attach filter listeners
function attachFilterListeners() {
    const filters = [
        'filter-category',
        'filter-name',
        'filter-make',
        'filter-model',
        'filter-productserial',
        'filter-condition',
        'filter-project',
        'filter-empname',
        'filter-handoverdate',
        'filter-set'
        
    ];

    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', function () {
                filterTable();
            });
        }
    });
} // End of attachFilterListeners

// Attach search listener
function attachSearchListener() {
    const searchInput = document.getElementById('myInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function () {
            const searchTerm = this.value.toLowerCase();
            let filtered = [...tableData]; // Start with the original data

            if (searchTerm) {
                filtered = filtered.filter(item => {
                    // Search across all relevant string fields of each item
                    const searchableFields = [
                        item.Category,
                        item.Name,
                        item.Make,
                        item.Model,
                        item.ProductSerial, // Add ProductSerial to searchable fields
                        getConditionText(item.Condition), // Use helper for condition
                        item.ProjectName || item.project_id, // Project Name
                        item.OwnerName || item.Owner, // Owner Name
                        item.Handover_Date,
                        item.set,
                        item.addItem_remarks
                    ];
                    return searchableFields.some(field =>
                        field && String(field).toLowerCase().includes(searchTerm)
                    );
                });
            }
            displayData(filtered); // Re-render the table with searched data
        });
    }
} // End of attachSearchListener

// Function to adjust UI based on user permissions
function adjustButtonsVisibility(sessionData) {
    console.log("toa value", toa)
    if (toa !== 'Admin') {
        // Hide admin-only sections
        document.getElementById('addeletesection').style.display = 'none';
        document.getElementById('emppanelsection').style.display = 'none';
    }
} // End of adjustButtonsVisibility

// Call fetchData when the page loads
window.onload = function() {
    initializeDataTable(); // Initialize DataTable once
    fetchData();
};


function getConditionText(val) {
    const conditions = {
        0: 'Good',
        1: 'Not OK',
        2: 'Damaged'
    };
    return conditions[Number(val)] !== undefined ? conditions[Number(val)] : val;
}

// Function to delete an item by Product ID
function deleteItem(productId) {
    console.log('deleteItem called with ProductID:', productId);
    
    if (!productId) {
        alert('Product ID not found');
        return;
    }

    if (confirm('Are you sure you want to delete this item?')) {
        console.log('Sending delete request for ProductID:', productId);
        $.ajax({
            url: '/delete_item',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ product_id: productId }),
            success: function (response) {
                console.log('Delete response:', response);
                alert(response.message);
                fetchData(); // Reload table after deletion
            },
            error: function (xhr, status, error) {
                console.log('Delete error:', xhr.responseText);
                alert('Error deleting item: ' + xhr.responseText);
            }
        });
    }
}
