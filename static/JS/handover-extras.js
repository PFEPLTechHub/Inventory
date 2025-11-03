// Add event listeners to select elements to check for default option
var selectElements = document.querySelectorAll('select[required]');
selectElements.forEach(function(selectElement) {
    selectElement.addEventListener('change', function() {
        if (selectElement.value !== "") {
            // Enable the submit button when all required fields are selected
            submitButton.disabled = false;
        } else {
            // Disable the submit button if any required field is not selected
            submitButton.disabled = true;
        }
    });
});   


document.getElementById("submitButton").addEventListener("click", function(event) {
    // Prevent the default form submission
    event.preventDefault();

    var selectElements = document.querySelectorAll('select[required]');
    var errorMessage = "";

    // Check if any required select element is empty
    selectElements.forEach(function(selectElement) {
        if (selectElement.value === "") {
            errorMessage = "Please select a value for all required fields.";
        }
    });

    // Get sender and receiver details
    var fromPerson = document.getElementById("Sender").textContent.trim();
    var toPerson = document.getElementById("Receiver").value;
    var fromProject = document.getElementById("Source").textContent.trim();
    var toProject = document.getElementById("Destination").value;
    //console.log('fromperson toperson fromproject toproject', fromPerson, toPerson, fromProject, toProject);

    // Check if From Person and To Person, and From Project and To Project are the same
    if (fromPerson === toPerson && fromProject === toProject) {
        errorMessage = "Source, Destination, Sender and Receiver should not be the same";
    }

    // Check if there are no selected items in the first tab's table
    if (errorMessage === "" && selectedItems.length === 0) {
        errorMessage = "Please select at least 1 item before initiating the transaction.";
    }

    // Check if any condition dropdown in the maintable has the default option selected
    var conditionDropdowns = document.querySelectorAll('#maintable select');
    conditionDropdowns.forEach(function(dropdown) {
        if (dropdown.value === "") {
            errorMessage = "Please select a condition in the Selected Items tab for each product.";
        }
    });
    
    // Images are optional: no blocking validation for missing or invalid images

    // If there is any error, show the floating message box with the error message
    if (errorMessage !== "") {
        floatingMessageBox(errorMessage, 'red');
    } else {
        document.getElementById("submitButton").disabled = true; // Disable the button
        logRowValues(); // Call the function to log row values
    }
});






function logRowValues() {
    var formObject = [];

    var senderid = session_data.ID;
    var sendername = session_data.Name;

    var selectedOption = document.getElementById('Receiver').selectedOptions[0];
    var employeeName = selectedOption.textContent;
    var receiver_id = selectedOption.value;
    
    // Detect receiver type
    let receiverType = "user"; // default
    if (selectedOption.getAttribute("data-type") === "manager") {
        receiverType = "manager";
    }

    var otherFormValues = {
        Source: document.getElementById("Source").value.trim(),
        Destination: document.getElementById("Destination").value,
        Sendername: sendername,
        Senderid: senderid,
        Receiverid: receiver_id,
        Receivername: employeeName,
        ReceiverType: receiverType
    };

    formObject.push(otherFormValues);

    console.log('formObject initial: ', formObject);
    console.log('Selected Items before processing:', selectedItems);

    selectedItems.forEach(function(item) {
        var productId = item.ProductID;
        var imageData = uploadedImages[productId] || { ext: "" };

        var row = document.querySelector(`#maintable tr td select[onchange*="${item.ProductID}"]`);
        var remarkInput = document.querySelector(`#maintable input[type="text"][onchange*="${item.ProductID}"]`);
        
        var condition = row ? row.value : "";
        var remark = remarkInput ? remarkInput.value : "";

        var rowData = {
            Set: item.Set || "",
            Category: item.Category || "",
            Name: item.Name || "",
            Make: item.Make || "",
            Model: item.Model || "",
            ProductID: productId,
            SenderCondition: condition,
            SenderRemark: remark,
            SenderImage: imageData.ext,
            ImageValid: imageData.valid || false
        };

        formObject.push(rowData);
    });

    console.log("✅ Final formObject: ", formObject);
    console.log("✅ Final formObject stringified: ", JSON.stringify(formObject));

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/send_approval_request", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                console.log('Server response:', data);

                if (data.status === 'success') {
                    floatingMessageBox(data.message, 'green', 'homepage');

                    const maintableBody = document.querySelector('#maintable tbody');
                    maintableBody.innerHTML = "";

                    uploadedImages = {};
                    selectedItems = [];

                    document.getElementById("submitButton").disabled = false;

                    // ✅ Telegram Bot Integration - SAFELY
    try {
      if (Array.isArray(formObject) && formObject.length > 0) {
        const preview = {
          formType: typeof formObject,
          entryCount: formObject.length,
          firstEntry: formObject[0]
        };
        console.log("📤 Preview formObject to Telegram bot:", preview);

        fetch("http://localhost:3000/api/notify/send-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formObject)
        })
          .then(res => {
            console.log("📥 Bot API status:", res.status);
            return res.json();
          })
          .then(botResponse => {
            console.log("✅ Telegram bot acknowledged:", botResponse);
          })
          .catch(botErr => {
            console.warn("⚠️ Telegram bot error:", botErr.message);
          });
      } else {
        console.warn("⚠️ formObject is not valid or empty:", formObject);
      }
    } catch (botWrapErr) {
      console.error("🔴 Unexpected error before sending to bot:", botWrapErr);
    }

                } else {
                    floatingMessageBox(data.message, 'red');
                    console.error('Error:', data.message);
                }
            } else {
                floatingMessageBox("Server error: " + xhr.status, 'red');
                console.error('Error:', xhr.status);
            }
        }
    };

    xhr.send(JSON.stringify(formObject));
}