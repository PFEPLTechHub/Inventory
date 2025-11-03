window.onload = function() {
    // Call Flask route to get session data (for button visibility)
    var sessionXhr = new XMLHttpRequest();
    sessionXhr.open("GET", "/get_session_data", true);
    sessionXhr.onreadystatechange = function () {
        if (sessionXhr.readyState === 4 && sessionXhr.status === 200) {
            var data = JSON.parse(sessionXhr.responseText);
            adjustButtonsVisibility(data)
        }
    };
    sessionXhr.send();

    // Fetch dropdown data for category, project, owner
    var dropdownXhr = new XMLHttpRequest();
    dropdownXhr.open("GET", "/additem_dropdown_data", true);
    dropdownXhr.onreadystatechange = function () {
        if (dropdownXhr.readyState === 4 && dropdownXhr.status === 200) {
            var data = JSON.parse(dropdownXhr.responseText);
            populateDropdownsDelete(data);
        }
    };
    dropdownXhr.send();
};

function populateDropdownsDelete(data) {
    var categorySelect = document.getElementById("category");
    var projectSelect = document.getElementById("project");
    var ownerSelect = document.getElementById("owner");

    // Sort the categories and projects alphabetically
    var sortedCategories = data.categories.sort();
    var sortedProjects = data.projects.sort((a, b) => a.Projects.localeCompare(b.Projects));

    // Populate categories dropdown
    sortedCategories.forEach(function(category) {
        var option = document.createElement("option");
        option.value = category;
        option.text = category;
        categorySelect.add(option);
    });

    // Populate projects dropdown
    sortedProjects.forEach(function(project) {
        var option = document.createElement("option");
        option.value = project.project_id;
        option.text = project.Projects;
        projectSelect.add(option);
    });

    // Add event listener to project dropdown to update owners
    projectSelect.addEventListener('change', function() {
        updateOwnersDropdownDelete(this.value, data.users);
    });
}

function updateOwnersDropdownDelete(selectedProjectId, users) {
    var ownerSelect = document.getElementById("owner");
    ownerSelect.innerHTML = ""; // Clear existing options

    // Filter users by selected project_id (ensure type match)
    var filteredUsers = users.filter(function(user) {
        return String(user.project_id) === String(selectedProjectId);
    });

    if (filteredUsers.length > 0) {
        // Sort owners alphabetically by Name
        filteredUsers.sort((a, b) => a.Name.localeCompare(b.Name));
        filteredUsers.forEach(function(user) {
            var option = document.createElement("option");
            option.value = user.ID;
            option.text = user.Name;
            ownerSelect.add(option);
        });
    } else {
        var option = document.createElement("option");
        option.text = "No owners available";
        ownerSelect.add(option);
    }
}

function deleteItem() {
    var category = document.getElementById("category").value;
    var name = document.getElementById("name").value;
    var make = document.getElementById("make").value;
    var model = document.getElementById("model").value;
    var productSerial = document.getElementById("product-serial").value;
    var owner = document.getElementById("owner").value;
    var project = document.getElementById("project").value;

    // Check if any input box is empty
    if (!category || !name || !make || !model || !productSerial || !owner || !project) {
        floatingMessageBox('Please fill all details', 'red');
        return;
    }

    // Send data to Flask route using AJAX
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/deleteitem", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.message === 'Item deleted successfully') {
                        floatingMessageBox('Item removed successfully', 'green', 'homepage');
                    } else if (response.message === 'No matching item found in the database') {
                        floatingMessageBox('Values do not match, please enter precise details for each input', 'red');
                    }
                } catch (e) {
                    floatingMessageBox('An error occurred while processing the response', 'red');
                }
            } else {
                floatingMessageBox('An error occurred with the request: ' + xhr.statusText, 'red');
            }
        }
    };

    xhr.onerror = function () {
        floatingMessageBox('Request failed. Please check your network connection.', 'red');
    };

    var data = JSON.stringify({
        category: category,
        name: name,
        make: make,
        model: model,
        product_serial: productSerial,
        owner: owner,
        project: project
    });

    try {
        xhr.send(data);
    } catch (e) {
        floatingMessageBox('An error occurred while sending the request', 'red');
    }
}