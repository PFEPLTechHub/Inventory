document.getElementById('uniqueprojects').addEventListener('click', function () {
    window.location.href = '/uniqueprojects';
});

window.onload = function () {
    let globalProjects = [];

    fetch('/get_projects')
        .then(response => response.json())
        .then(data => {
            globalProjects = data.projects;
            return fetch('/get_employee_data_panel');
        })
        .then(response => response.json())
        .then(data => {
            console.log('hiiiiiiii', data);
            populateTable(data.emp_data, globalProjects);
            adjustButtonsVisibility(data.session_data);
        });
};

function populateTable(empData, projectList) {
    console.log('Populating table with employee data:', empData);
    console.log('Available projects:', projectList);
    
    const tableBody = document.getElementById('employeeTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows
    
    empData.forEach(employee => {
        if (employee.TypeOfAccount === "Employee") {
            console.log('Processing employee:', employee.Name, 'Project:', employee.Project, 'Project ID:', employee.project_id);
            
            const row = document.createElement('tr');

            const idCell = document.createElement('td');
            idCell.textContent = employee.Name;
            row.appendChild(idCell);

            const mailCell = document.createElement('td');
            const mailInput = document.createElement('input');
            mailInput.type = 'text';
            mailInput.value = employee.MailID;
            mailInput.disabled = true;
            mailCell.appendChild(mailInput);
            row.appendChild(mailCell);

            const phoneCell = document.createElement('td');
            const phoneInput = document.createElement('input');
            phoneInput.type = 'text';
            phoneInput.value = employee.PhoneNo;
            phoneInput.disabled = true;
            phoneCell.appendChild(phoneInput);
            row.appendChild(phoneCell);

            const projectCell = document.createElement('td');
            const projectDropdown = document.createElement('select');
            projectDropdown.disabled = true;

            let originalProject = '';
            projectList.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                console.log('Comparing project:', project, 'with employee project:', employee.Project, 'Match:', project === employee.Project);
                if (project === employee.Project) {
                    option.selected = true;
                    originalProject = project;
                    console.log('Selected project for', employee.Name, ':', project);
                }
                projectDropdown.appendChild(option);
            });

            // Store original project as data attribute
            projectDropdown.setAttribute('data-original-project', originalProject);
            projectCell.appendChild(projectDropdown);
            row.appendChild(projectCell);

            const nameCell = document.createElement('td');
            nameCell.textContent = employee.Name;
            nameCell.style.display = 'none';
            row.appendChild(nameCell);

            const actionCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.id = 'editButton';
            editBtn.addEventListener('click', function () {
                enableEditing(row);
            });
            actionCell.appendChild(editBtn);

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.id = 'saveButton';
            saveBtn.style.display = 'none';
            saveBtn.addEventListener('click', function () {
                saveData(row);
            });
            actionCell.appendChild(saveBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.id = 'deleteButton';
            deleteBtn.style.display = 'none';
            deleteBtn.addEventListener('click', function () {
                deleteData(row);
            });
            actionCell.appendChild(deleteBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.id = 'cancelButton';
            cancelBtn.style.display = 'none';
            cancelBtn.addEventListener('click', function () {
                cancelEdit(row);
            });
            actionCell.appendChild(cancelBtn);

            row.appendChild(actionCell);
            tableBody.appendChild(row);
        }
    });
}

function enableEditing(row) {
    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(input => input.disabled = false);

    const projectDropdown = row.children[3].querySelector('select');
    const selectedOption = projectDropdown.options[projectDropdown.selectedIndex];
    if (selectedOption) {
        projectDropdown.setAttribute('data-original-project', selectedOption.value);
    }

    const editBtn = row.querySelector('button:nth-child(1)');
    const saveBtn = row.querySelector('button:nth-child(2)');
    const cancelBtn = row.querySelector('button:nth-child(3)');
    const deleteBtn = row.querySelector('button:nth-child(4)');

    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    deleteBtn.style.display = 'inline-block';
}

function saveData(row) {
    const email = row.children[1].querySelector('input').value;
    const phone = row.children[2].querySelector('input').value;
    const projectDropdown = row.children[3].querySelector('select');
    const project = projectDropdown.value;
    const originalProject = projectDropdown.getAttribute('data-original-project');
    const name = row.children[4].textContent;

    const updatedData = {
        Name: name,
        Project: project,
        email: email,
        phone: phone
    };

    fetch('/update_employee_details', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'success') {
            floatingMessageBox('Data updated successfully');

            if (project !== originalProject) {
                console.log("📤 Notifying Telegram bot about project update");
                console.log("📦 Payload to Bot:", { phone: updatedData.phone, newProject: project });

                fetch("http://localhost:3000/api/notify/project-update", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ phone: updatedData.phone, newProject: project })
                })
                .then(res => {
                    console.log("📥 Bot response status:", res.status);
                    return res.text();
                })
                .then(text => {
                    try {
                        const botRes = JSON.parse(text);
                        console.log("✅ Bot project update webhook sent successfully:", botRes);
                    } catch (err) {
                        console.error("❌ Failed to parse bot response:", text);
                    }
                })
                .catch(err => {
                    console.warn("⚠️ Failed to notify Telegram bot:", err.message);
                });

                // Update stored original project
                projectDropdown.setAttribute('data-original-project', project);
            }

            // Refresh the table data to show updated values
            refreshTableData();

            projectDropdown.disabled = true;
            row.querySelectorAll('input, select').forEach(input => {
                input.disabled = true;
                input.style.display = '';
            });
        } else if (data.message === 'Pending Items') {
            floatingMessageBox('Please ask the employee to relieve all items from their inventory');
        } else {
            floatingMessageBox('Failed to update data');
        }

        const editBtn = row.querySelector('#editButton');
        const saveBtn = row.querySelector('#saveButton');
        const cancelBtn = row.querySelector('#cancelButton');
        const deleteBtn = row.querySelector('#deleteButton');

        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    });
}

// Function to refresh table data from server
function refreshTableData() {
    console.log('Refreshing table data...');
    fetch('/get_projects')
        .then(response => response.json())
        .then(data => {
            const globalProjects = data.projects;
            return fetch('/get_employee_data_panel');
        })
        .then(response => response.json())
        .then(data => {
            console.log('Refreshed data:', data);
            populateTable(data.emp_data, globalProjects);
            adjustButtonsVisibility(data.session_data);
        })
        .catch(error => {
            console.error('Error refreshing table data:', error);
        });
}

function deleteData(row) {
    const name = row.children[4].textContent;

    fetch('/delete_employee_details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name: name })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'success') {
            floatingMessageBox('Data deleted successfully');
            // Refresh the table data to show updated state
            refreshTableData();
        } else if (data.message === 'Pending Items') {
            floatingMessageBox('Please ask the employee to relieve all items from their inventory');
        } else if (data.message === 'Transaction Process') {
            floatingMessageBox('The employee has an ongoing pending transaction');
        } else {
            floatingMessageBox('Failed to delete data');
        }
    });
}

function cancelEdit(row) {
    const editBtn = row.querySelector('#editButton');
    const saveBtn = row.querySelector('#saveButton');
    const cancelBtn = row.querySelector('#cancelButton');
    const deleteBtn = row.querySelector('#deleteButton');

    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    deleteBtn.style.display = 'none';

    const inputs = row.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        input.disabled = true;
    });
}

$("#myInput").on("keyup", function () {
    var value = $(this).val().toLowerCase();
    $("#employeeTable tbody tr").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
});
