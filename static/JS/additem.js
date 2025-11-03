window.onload = function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/additem_dropdown_data", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("Backend response for additem dropdowns:", xhr.responseText);
            var data = JSON.parse(xhr.responseText);
            populateDropdowns(data);
        }
    };
    xhr.send();
};

function populateDropdowns(data) {
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
        updateOwnersDropdown(this.value, data.users);
    });
}

function updateOwnersDropdown(selectedProjectId, users) {
    var ownerSelect = document.getElementById("owner");
    ownerSelect.innerHTML = ""; // Clear existing options

    // Filter users by selected project_id (ensure type match)
    var filteredUsers = users.filter(function(user) {
        return String(user.project_id) === String(selectedProjectId);
    });

    console.log("Filtered owners:", filteredUsers);

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


function addItem() {
    var category = document.getElementById("category").value;
    var name = document.getElementById("name").value;
    var make = document.getElementById("make").value;
    var model = document.getElementById("model").value;
    var productSerial = document.getElementById("product-serial").value;
    var project = document.getElementById("project").value;
    var owner = document.getElementById("owner").value;
    var remark = document.getElementById("remark").value;
    var set = document.getElementById("set").value;

    if (!category || !name || !make || !model || !productSerial || !project || !owner || !remark || !set) {
        floatingMessageBox('Please fill all details', 'red');
        return;
    }



    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/additem", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.message === 'Item added successfully') {
                        floatingMessageBox('Item added successfully', 'green', 'homepage');
                        // ✅ Notify Telegram Bot (New Item Added)
                        const itemPayload = {
                            ProductID: response.ProductID,         // returned from backend
                            OwnerID: owner,
                            ProjectID: project,
                            Category: category,
                            Name: name,
                            Make: make,
                            Model: model,
                            ProductSerial:productSerial,
                            Set:set

                        };

                        console.log("📦 Notifying Telegram Bot about new item:", itemPayload);

                        fetch("http://localhost:3000/api/notify/item-added", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(itemPayload)
                        })
                        .then(res => res.json())
                        .then(botRes => {
                            console.log("✅ Bot webhook sent:", botRes);
                        })
                        .catch(err => {
                            console.warn("⚠️ Bot webhook failed:", err.message);
                        });
                    } 
                } catch (e) {
                    floatingMessageBox('An error occurred while processing the response', 'red');
                }
            } else if (xhr.status === 400) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.message === 'Product ID already exists') {
                        floatingMessageBox('Product ID already exists', 'red');
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
        productSerial: productSerial,
        owner: owner,
        project: project,
        remark: remark,
        set: set
    });

    console.log('this is the data to be sent', data);
    xhr.send(data);
}
