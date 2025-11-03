// Declare the data variable at the global scope
var data;
var receiverid;
var senderid;
window.onload = function () {
    // Get transaction_uid from URL
    const Transaction_uid = window.location.pathname.split('/').pop();
    // --- Fix: Always refresh backend data before fetching form data ---
    console.log('[DEBUG] Sending /send_Transaction_uid to refresh backend data for:', Transaction_uid);
    var xhr1 = new XMLHttpRequest();
    xhr1.open("GET", "/send_Transaction_uid?transaction_uid=" + Transaction_uid, true);
    xhr1.onreadystatechange = function() {
        if (xhr1.readyState === XMLHttpRequest.DONE) {
            console.log('[DEBUG] /send_Transaction_uid response:', xhr1.status, xhr1.responseText);
            // Now fetch the actual form data
            fetchApproveReceiveFormData(Transaction_uid);
        }
    };
    xhr1.send();
};

function fetchApproveReceiveFormData(Transaction_uid) {
    var xhr2 = new XMLHttpRequest();
    xhr2.open("GET", "/get_form_data?transaction_uid=" + encodeURIComponent(Transaction_uid), true);
    xhr2.onreadystatechange = function () {
        if (xhr2.readyState === 4 && xhr2.status === 200) {
            try {
                // Parse the response into a JavaScript object
                var data = JSON.parse(xhr2.responseText);
                console.log("[DEBUG] Received data:", data); // Log the response to check

                // Check if transaction_details exists and is an array
                if (data.transaction_details && Array.isArray(data.transaction_details) && data.transaction_details.length > 0) {
                    const transaction = data.transaction_details[0]; // Use the first item
                    const productRows = (data.transaction_product_details || []).filter(r => String(r.item_status) === '1');
                    console.log("[DEBUG] Transaction object from backend:", transaction);

                    // Extract information from transaction
                    receiverid = transaction.Receiver_uid;
                    senderid = transaction.Sender_uid;
                    const initiationDate = transaction.InitiationDate.split(' ')[0];
                    const completionDate = transaction.CompletionDate.split(' ')[0];
                    const ewayreason = transaction.ewayreason || '-';  // Show '-' if Eway reason is missing

                    // Set values in the DOM (Assuming these elements exist in your HTML)
                    document.getElementById("Transaction_uid").textContent = transaction.Transaction_uid || 'Loading Form ID ...';
                    document.getElementById("ewaybillno").textContent = transaction.EwayBillNo || 'Loading Eway Bill No ...';
                    document.getElementById("Sender").textContent = transaction.SenderName|| 'Loading Sender ...';
                    document.getElementById("Receiver").textContent = transaction.ReceiverName || 'Loading Receiver ...';
                    document.getElementById("Source").textContent = transaction.SourceName || transaction.Source || 'Loading Source ...';
                    document.getElementById("Destination").textContent = transaction.DestinationName || transaction.Destination || 'Loading Destination ...';
                    document.getElementById("InitiationDate").textContent = initiationDate;
                    document.getElementById("CompletionDate").textContent = completionDate;

                     // Set Sender Manager and Receiver Manager from project_managers
                    if (data.project_managers && Array.isArray(data.project_managers)) {
                        // Get source and destination values
                        var sourceValue = transaction.Source || '';
                        var destinationValue = transaction.Destination || '';
                        
                        // Find the corresponding manager entries based on source and destination
                        var senderManagerName = '';
                        var receiverManagerName = '';
                        
                        // Look through project_managers to find the manager names directly
                        for (var i = 0; i < data.project_managers.length; i++) {
                            var projectManager = data.project_managers[i];
                            console.log("[DEBUG] Approve Receive - Comparing project_id:", projectManager.project_id, "with source:", sourceValue, "and destination:", destinationValue);
                            
                            // Compare using project_id instead of Projects text
                            if (String(projectManager.project_id) === String(sourceValue)) {
                                senderManagerName = projectManager.ManagerName || projectManager.Manager;
                                console.log("[DEBUG] Approve Receive - Matched sender manager:", senderManagerName);
                            }
                            if (String(projectManager.project_id) === String(destinationValue)) {
                                receiverManagerName = projectManager.ManagerName || projectManager.Manager;
                                console.log("[DEBUG] Approve Receive - Matched receiver manager:", receiverManagerName);
                            }
                        }
                        
                        // Set the manager names directly
                        document.getElementById("Sender-manager").textContent = senderManagerName || 'Manager not available';
                        document.getElementById("Receiver-manager").textContent = receiverManagerName || 'Manager not available';
                    } else {
                        console.error("No project manager data available");
                    }

                    // Show the ewaybill reason data in the data cell
                    document.getElementById("ewaybillreasondatatd").textContent = ewayreason;

                    // Conditionally show or hide the column heading based on reason
                    if (ewayreason === "-") {
                        document.getElementById("ewaybillreason").style.display = "none";
                    } else {
                        document.getElementById("ewaybillreason").style.display = "table-cell";
                        document.getElementById("ewaybillreason").textContent = ewayreason;
                    }

                    // Check if product details are available
                    if (Array.isArray(productRows) && productRows.length > 0) {
                        const table = document.getElementById("mainTable").getElementsByTagName('tbody')[0];
                        productRows.forEach((row, index) => {
                            const newRow = table.insertRow();

                            // Insert row cells (Only populate fields, don't remove any existing ones)
                            newRow.insertCell(0).textContent = index + 1;  // Row index

                            // Status cell - All items at stage 4 are accepted (approved by receiver)
                            var statusCell = newRow.insertCell(1);
                            var statusLabel = document.createElement('label');
                            statusLabel.textContent = 'Accepted'; // All items at stage 4 are accepted
                            statusCell.appendChild(statusLabel);

                            // Populate remaining fields with default value '-' if missing
                            newRow.insertCell(2).textContent = row.set || '-'; // Set
                            newRow.insertCell(3).textContent = row.Category || '-'; // Category
                            newRow.insertCell(4).textContent = row.Name || '-'; // Name
                            newRow.insertCell(5).textContent = row.Make || '-'; // Make
                            newRow.insertCell(6).textContent = row.Model || '-'; // Model
                            newRow.insertCell(7).textContent = row.ProductSerial || '-'; // Product Serial
                            newRow.insertCell(8).textContent = getConditionText(Number(row.SenderCondition)) || '-'; // Sender Condition
                            newRow.insertCell(9).textContent = row.SenderRemark || '-'; // Sender Remark
                            const senderImageCell = newRow.insertCell(10);

                            if (row.SenderImage === 'jpg') {
                                const tick = document.createElement('span');
                                tick.textContent = '✅';
                                tick.style.fontSize = '16px';
                                tick.style.display = 'inline-block';
                                tick.style.width = '100%';
                                tick.style.textAlign = 'center';
                                tick.style.cursor = 'pointer';
                                senderImageCell.style.cursor = 'pointer';
                                senderImageCell.appendChild(tick);
                                
                                // Add click handler for sender image
                                senderImageCell.onclick = () => {
                                    OpenCarousel(row.ProductID, 'sender', transaction.Transaction_uid);
                                };
                            } else {
                                senderImageCell.textContent = '-';
                            }

                            newRow.insertCell(11).textContent = getConditionText(Number(row.ReceiverCondition)) || '-'; // Receiver Condition
                            newRow.insertCell(12).textContent = row.ReceiverRemark || '-'; // Receiver Remark
                            const receiverImageCell = newRow.insertCell(13);
                            if (row.ReceiverImage === 'jpg') {
                                const tick = document.createElement('span');
                                tick.textContent = '✅';
                                tick.style.fontSize = '16px';
                                tick.style.display = 'inline-block';
                                tick.style.width = '100%';
                                tick.style.textAlign = 'center';
                                tick.style.cursor = 'pointer';
                                receiverImageCell.style.cursor = 'pointer';
                                receiverImageCell.appendChild(tick);
                                
                                // Add click handler for receiver image
                                receiverImageCell.onclick = () => {
                                    OpenCarousel(row.ProductID, 'receiver', transaction.Transaction_uid);
                                };
                            } else {
                                receiverImageCell.textContent = '-';
                            }

                            // Product ID as hidden cell (keep this for data use only)
                            const hiddenCell = newRow.insertCell(14);
                            hiddenCell.textContent = row.ProductID || '-';
                            hiddenCell.style.display = 'none';
                        });
                    }

                    // --- Approval status logic for receiver manager form ---
                    const approvalToReceiveStatus = transaction['ApprovalToReceive'];
                    console.log('[DEBUG] ApprovalToReceive raw value:', approvalToReceiveStatus, 'Type:', typeof approvalToReceiveStatus);
                    const approveBtn = document.getElementById('approvalButton');
                    const disapproveBtn = document.getElementById('disapproveButton');

                    // Normalize approvalToReceiveStatus to integer for robust comparison
                    let approvalToReceiveNormalized = 0;
                    if (approvalToReceiveStatus === undefined || approvalToReceiveStatus === null || approvalToReceiveStatus === '-' || approvalToReceiveStatus === '') {
                        approvalToReceiveNormalized = 0;
                    } else if (typeof approvalToReceiveStatus === 'string' && !isNaN(parseInt(approvalToReceiveStatus))) {
                        approvalToReceiveNormalized = parseInt(approvalToReceiveStatus);
                    } else if (typeof approvalToReceiveStatus === 'number') {
                        approvalToReceiveNormalized = approvalToReceiveStatus;
                    }
                    console.log('[DEBUG] ApprovalToReceive normalized value:', approvalToReceiveNormalized, 'Type:', typeof approvalToReceiveNormalized);

                    if (approvalToReceiveNormalized === 1) {
                        console.log('[DEBUG] Form already approved by receiver manager. Disabling buttons.');
                        approveBtn.disabled = true;
                        disapproveBtn.disabled = true;
                        floatingMessageBox("This form has already been approved by the receiver manager.", 'green', 'approvetable');
                    } else if (approvalToReceiveNormalized === 2) {
                        console.log('[DEBUG] Form already disapproved by receiver manager. Disabling buttons.');
                        approveBtn.disabled = true;
                        disapproveBtn.disabled = true;
                        floatingMessageBox("This form has already been disapproved by the receiver manager.", 'red', 'approvetable');
                    } else {
                        console.log('[DEBUG] Form is pending. Buttons enabled.');
                    }
                } else {
                    console.error("No transaction data found or data format is incorrect.");
                }
            } catch (e) {
                console.error("Error parsing or processing data:", e);
            }
        }
    };
    xhr2.send();
}

var submitButton = document.getElementById("approvalButton");
submitButton.addEventListener("click", function () {
    logRowValues();
});

function logRowValues() {
    var formObject = [];
    var Transaction_uid = document.getElementById("Transaction_uid").textContent.trim();
    //var toPersonValue = document.getElementById("Receiver").textContent.trim();
    var fromProjectValue = document.getElementById("Source").textContent.trim();
    var toProjectValue = document.getElementById("Destination").textContent.trim();
    var toReceiver = document.getElementById("Receiver").textContent.trim();
    var fromSender = document.getElementById("Sender").textContent.trim();
    var completionDate = document.getElementById("CompletionDate").textContent.trim();
    var SenderManager = document.getElementById("Sender-manager").textContent.trim();
    var ReceiverManager = document.getElementById("Receiver-manager").textContent.trim();

    var newObject = {
         Transaction_uid:  Transaction_uid,
        receiverid: receiverid,
        Project: toProjectValue,
        completiondate : completionDate,
        Sendermanager: SenderManager, // Already storing the manager name, not the ID
        Receivermanager: ReceiverManager // Already storing the manager name, not the ID
    };
    formObject.push(newObject);


    var tableBody = document.querySelector("#mainTable tbody");
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function (row) {
        var cells = row.querySelectorAll('td');
        var rowData = {
            Set: cells[2].innerText,
            Category: cells[3].innerText,
            Name: cells[4].innerText,
            Make: cells[5].innerText,
            Model: cells[6].innerText,
            ProductID: cells[14].innerText,
            SenderCondition: cells[8].innerText,
            SenderImage: cells[10].innerText,


            ReceiverCondition: cells[11].innerText,
            ReceiverImage: cells[13].innerText,
            Reached: cells[1].innerText,
        };
        // Add debug statements
        console.log("[DEBUG] receiverid value:", receiverid);
        console.log("[DEBUG] senderid value:", senderid);
        console.log("[DEBUG] rowData.Reached value:", rowData.Reached);

        // Owner logic - All items transfer to receiver when manager approves
        rowData.Owner = receiverid; // All items at stage 4 transfer to receiver
        console.log("[DEBUG] rowData.Owner set to:", rowData.Owner);

        rowData.Project = (rowData.Reached === 'Accepted') ? toProjectValue : fromProjectValue;
        console.log("[DEBUG] rowData.Project set to:", rowData.Project);
        rowData.empreceivername = toReceiver;
        rowData.empsendname = fromSender;
        // rowData.Condition = (rowData.Reached === 'Accepted') ? cells[9].innerText : data.SenderCondition;
        formObject.push(rowData);
    });

    console.log("[DEBUG] Final formObject:", formObject);

    // Create the proper data structure expected by the backend
    var approvalData = [];
    
    // Add the metadata object as the first element
    var metadata = {
        'completiondate': new Date().toISOString().slice(0, 19).replace('T', ' '), // Current datetime
        'Transaction_uid': formObject[0].Transaction_uid || '',
        'Receiverid': receiverid || ''
    };
    approvalData.push(metadata);
    
    // Add all the product data
    approvalData = approvalData.concat(formObject);
    
    console.log("[DEBUG] Final approvalData:", approvalData);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/approve_receive_request", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                console.log('Success:', xhr.responseText);
                floatingMessageBox("Approval to Receive items has been given.", 'green', 'approvetable');

                // ✅ Notify Telegram Bot (Sender - Stage 4)
                    const TransactionUid = formObject.find(obj => obj.Transaction_uid)?.Transaction_uid || "";

                    console.log("📤 Stage 4 Notification Triggered");
                    console.log("🆔 Transaction_uid to send:", TransactionUid);

                    const payload = { Transaction_uid: TransactionUid };
                    console.log("📦 Payload being sent to bot:", JSON.stringify(payload));

                    fetch("http://localhost:3000/api/notify/receive-approved", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                    })
                    .then(res => {
                        console.log("📥 Telegram bot response status:", res.status);
                        return res.json();
                    })
                    .then(data => {
                        console.log("✅ Stage 4 notification sent successfully:", data);
                    })
                    .catch(err => {
                        console.warn("⚠️ Stage 4 bot notify failed:", err.message);
                    });

                // FIXED: Redirect to approval table instead of handover form
                // The floating.js will handle the redirect to '/approvetable' based on 'approvetable' formname
                // No need for additional setTimeout redirect
            } else {
                console.error('Error:', xhr.status);
                floatingMessageBox(xhr.status, 'red');
            }
        }
    };
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(approvalData));
}

// console.log("NewObject: ",newObject)

var disapproveButton = document.getElementById("disapproveButton");

disapproveButton.addEventListener("click", function (event) {

    var remarksContainer = document.getElementById("remarksContainer");
    remarksContainer.style.display = "flex";

    // Enable and make the input box required
    var remarksInput = document.getElementById("disapproveremarks");
    remarksInput.required = true;

    // Modify the event listener to handle form submission
    var approvebtn = document.getElementById('approvalButton'); // Assuming this is your approve button ID

    approvebtn.disabled = true; // Use the disabled property to disable the button
    approvebtn.style.backgroundColor = "#808080"; 

    // Get the remarks input element and its value
    var remarksValue = remarksInput.value.trim();

    if (remarksValue === "") {
        // If the remarks input is empty, show an error message and prevent form submission
        floatingMessageBox('Please provide a reason for disapproval.');
        event.preventDefault(); // Prevent the form from submitting
        return; // Exit the function
    }

    var  Transaction_uid = document.getElementById("Transaction_uid").textContent.trim();
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/disapprove_receive_request", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                // Request was successful
                console.log("Form No sent successfully!");
                console.log( Transaction_uid)
                floatingMessageBox("Form Transaction has been disapproved", 'green', 'approvetable');
                // ✅ Notify Telegram Bot (Receiver Manager Disapproval - Stage 4)
                    console.log("📤 Preparing to notify Telegram bot (Stage 4 - Disapproval)");
                    console.log("📦 Payload:", {
                        Transaction_uid: Transaction_uid,
                        remarks: remarksValue
                    });

                    fetch("http://localhost:3000/api/notify/disapprove-receiver-manager", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            Transaction_uid: Transaction_uid,
                            remarks: remarksValue
                        })
                    })
                    .then(res => {
                        console.log("📥 Telegram bot response status:", res.status);
                        return res.json();
                    })
                    .then(botRes => {
                        console.log("✅ Stage 4 disapproval webhook sent to Telegram bot:", botRes);
                    })
                    .catch(err => {
                        console.warn("⚠️ Failed to notify Telegram bot (Stage 4 disapproval):", err.message);
                    });

             
                            } else {
                                // There was an error
                                console.error("Error:", xhr.statusText);
                            }
                        }
                    };
                    var data = JSON.stringify({ "Transaction_uid":  Transaction_uid, "remarks": remarksValue });
                    xhr.send(data);
                });

// Add the OpenCarousel function
function OpenCarousel(productId, mode, transactionId) {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'imageCarouselModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    // Initialize image pairs
    let imagePairs = [];
    const table = document.getElementById('mainTable');
    const rows = table.querySelectorAll('tbody tr');
    
    // Collect all products that have at least one image
    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        const rowProductId = cells[14].textContent; // Hidden ProductID cell
        const hasSenderImage = cells[10].textContent === '✅';
        const hasReceiverImage = cells[13].textContent === '✅';
        
        // If this product has at least one image (sender or receiver), add it to our pairs
        if (hasSenderImage || hasReceiverImage) {
            imagePairs.push({
                productId: rowProductId,
                senderImage: {
                    exists: hasSenderImage,
                    path: `/static/Images/${transactionId}/${rowProductId}_send.jpg`
                },
                receiverImage: {
                    exists: hasReceiverImage,
                    path: `/static/Images/${transactionId}/${rowProductId}_receive.jpg`
                }
            });
        }
    });

    // Create top bar
    const topBar = document.createElement('div');
    topBar.style.width = '100%';
    topBar.style.height = '60px';
    topBar.style.backgroundColor = 'transparent';
    topBar.style.display = 'flex';
    topBar.style.alignItems = 'center';
    topBar.style.justifyContent = 'space-between';
    topBar.style.padding = '0 20px';
    topBar.style.boxSizing = 'border-box';
    topBar.style.position = 'absolute';
    topBar.style.top = '0';
    topBar.style.zIndex = '2';

    // Close button (X)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.color = 'white';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '10px';
    closeBtn.style.position = 'absolute';
    closeBtn.style.left = '20px';
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    topBar.appendChild(closeBtn);

    // Action buttons container
    const actionBtns = document.createElement('div');
    actionBtns.style.display = 'flex';
    actionBtns.style.gap = '20px';
    actionBtns.style.marginLeft = 'auto';

    // Save button for sender image
    const saveSenderBtn = document.createElement('button');
    saveSenderBtn.innerHTML = '⬇️ Sender';
    saveSenderBtn.style.fontSize = '16px';
    saveSenderBtn.style.color = 'white';
    saveSenderBtn.style.background = 'none';
    saveSenderBtn.style.border = 'none';
    saveSenderBtn.style.cursor = 'pointer';
    saveSenderBtn.style.padding = '10px';
    saveSenderBtn.title = "Download sender image";
    
    // Save button for receiver image
    const saveReceiverBtn = document.createElement('button');
    saveReceiverBtn.innerHTML = '⬇️ Receiver';
    saveReceiverBtn.style.fontSize = '16px';
    saveReceiverBtn.style.color = 'white';
    saveReceiverBtn.style.background = 'none';
    saveReceiverBtn.style.border = 'none';
    saveReceiverBtn.style.cursor = 'pointer';
    saveReceiverBtn.style.padding = '10px';
    saveReceiverBtn.title = "Download receiver image";
    
    actionBtns.appendChild(saveSenderBtn);
    actionBtns.appendChild(saveReceiverBtn);
    topBar.appendChild(actionBtns);

    // Create main content area
    const mainContent = document.createElement('div');
    mainContent.style.flex = '1';
    mainContent.style.display = 'flex';
    mainContent.style.alignItems = 'center';
    mainContent.style.justifyContent = 'center';
    mainContent.style.position = 'relative';
    mainContent.style.padding = '20px';
    mainContent.style.margin = '0 auto';
    mainContent.style.maxWidth = '90%';

    // Navigation buttons
    const createNavButton = (text, isNext) => {
        const btn = document.createElement('div');
        btn.innerHTML = isNext ? '›' : '‹';
        btn.style.position = 'absolute';
        btn.style[isNext ? 'right' : 'left'] = '10px';
        btn.style.top = '50%';
        btn.style.transform = 'translateY(-50%)';
        btn.style.fontSize = '35px';
        btn.style.fontWeight = '500';
        btn.style.color = '#fff';
        btn.style.background = '#5b5b5b';
        btn.style.border = 'none';
        btn.style.borderRadius = '50%';
        btn.style.width = '32px';
        btn.style.height = '32px';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'all 0.2s';
        btn.style.zIndex = '3';
        btn.style.padding = '0';
        btn.style.margin = '0';
        btn.style.lineHeight = '32px';
        btn.style.textAlign = 'center';
        btn.style.userSelect = 'none';
        return btn;
    };

    const prevBtn = createNavButton('‹', false);
    const nextBtn = createNavButton('›', true);

    // Create image container for side-by-side display
    const imageContainer = document.createElement('div');
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.gap = '20px';
    imageContainer.style.width = '100%';
    imageContainer.style.maxHeight = 'calc(100vh - 200px)';
    imageContainer.style.position = 'relative';
    
    // Create sender image container with label
    const senderContainer = document.createElement('div');
    senderContainer.style.display = 'flex';
    senderContainer.style.flexDirection = 'column';
    senderContainer.style.alignItems = 'center';
    senderContainer.style.flex = '1';
    senderContainer.style.maxWidth = '45%';
    
    const senderLabel = document.createElement('div');
    senderLabel.textContent = 'Sender Image';
    senderLabel.style.color = 'white';
    senderLabel.style.fontSize = '16px';
    senderLabel.style.marginBottom = '10px';
    senderLabel.style.fontWeight = 'bold';
    
    const senderImage = document.createElement('img');
    senderImage.className = 'sender-image';
    senderImage.style.maxWidth = '100%';
    senderImage.style.maxHeight = '70vh';
    senderImage.style.objectFit = 'contain';
    senderImage.style.transition = 'transform 0.3s';
    senderImage.style.cursor = 'zoom-in';
    senderImage.style.border = '1px solid #444';
    
    senderContainer.appendChild(senderLabel);
    senderContainer.appendChild(senderImage);
    
    // Create receiver image container with label
    const receiverContainer = document.createElement('div');
    receiverContainer.style.display = 'flex';
    receiverContainer.style.flexDirection = 'column';
    receiverContainer.style.alignItems = 'center';
    receiverContainer.style.flex = '1';
    receiverContainer.style.maxWidth = '45%';
    
    const receiverLabel = document.createElement('div');
    receiverLabel.textContent = 'Receiver Image';
    receiverLabel.style.color = 'white';
    receiverLabel.style.fontSize = '16px';
    receiverLabel.style.marginBottom = '10px';
    receiverLabel.style.fontWeight = 'bold';
    
    const receiverImage = document.createElement('img');
    receiverImage.className = 'receiver-image';
    receiverImage.style.maxWidth = '100%';
    receiverImage.style.maxHeight = '70vh';
    receiverImage.style.objectFit = 'contain';
    receiverImage.style.transition = 'transform 0.3s';
    receiverImage.style.cursor = 'zoom-in';
    receiverImage.style.border = '1px solid #444';
    
    receiverContainer.appendChild(receiverLabel);
    receiverContainer.appendChild(receiverImage);
    
    // Add placeholder for missing images
    const missingImagePlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNjM2MzYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM4ODgiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    
    // Add zoom functionality for both images
    let senderZoomed = false;
    senderImage.onclick = () => {
        senderZoomed = !senderZoomed;
        senderImage.style.transform = senderZoomed ? 'scale(2)' : 'scale(1)';
        senderImage.style.cursor = senderZoomed ? 'zoom-out' : 'zoom-in';
    };
    
    let receiverZoomed = false;
    receiverImage.onclick = () => {
        receiverZoomed = !receiverZoomed;
        receiverImage.style.transform = receiverZoomed ? 'scale(2)' : 'scale(1)';
        receiverImage.style.cursor = receiverZoomed ? 'zoom-out' : 'zoom-in';
    };
    
    // Add images to container
    imageContainer.appendChild(senderContainer);
    imageContainer.appendChild(receiverContainer);
    mainContent.appendChild(imageContainer);

    // Create thumbnail bar
    const thumbnailBar = document.createElement('div');
    thumbnailBar.style.height = '100px';
    thumbnailBar.style.backgroundColor = 'transparent';
    thumbnailBar.style.display = 'flex';
    thumbnailBar.style.alignItems = 'center';
    thumbnailBar.style.justifyContent = 'center';
    thumbnailBar.style.gap = '10px';
    thumbnailBar.style.padding = '10px';
    thumbnailBar.style.position = 'absolute';
    thumbnailBar.style.bottom = '0';
    thumbnailBar.style.left = '0';
    thumbnailBar.style.right = '0';
    thumbnailBar.style.overflowX = 'auto';
    thumbnailBar.style.scrollBehavior = 'smooth';
    thumbnailBar.style.whiteSpace = 'nowrap';

    // Add components to modal
    modal.appendChild(topBar);
    modal.appendChild(mainContent);
    modal.appendChild(thumbnailBar);
    modal.appendChild(prevBtn);
    modal.appendChild(nextBtn);
    document.body.appendChild(modal);

    let currentImageIndex = 0;

    // Function to update current image pair and buttons
    const updateCurrentImage = (index) => {
        currentImageIndex = index;
        const currentPair = imagePairs[index];
        
        // Update sender image
        if (currentPair.senderImage.exists) {
            senderImage.src = currentPair.senderImage.path;
            senderImage.style.opacity = '1';
            senderImage.onerror = () => {
                senderImage.src = missingImagePlaceholder;
                console.error('Error loading sender image:', currentPair.senderImage.path);
            };
            
            // Enable download button
            saveSenderBtn.style.opacity = '1';
            saveSenderBtn.style.pointerEvents = 'auto';
            saveSenderBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = currentPair.senderImage.path;
                link.download = `sender_image_${currentPair.productId}.jpg`;
                link.click();
            };
        } else {
            senderImage.src = missingImagePlaceholder;
            senderImage.style.opacity = '0.5';
            
            // Disable download button
            saveSenderBtn.style.opacity = '0.5';
            saveSenderBtn.style.pointerEvents = 'none';
        }
        
        // Update receiver image
        if (currentPair.receiverImage.exists) {
            receiverImage.src = currentPair.receiverImage.path;
            receiverImage.style.opacity = '1';
            receiverImage.onerror = () => {
                receiverImage.src = missingImagePlaceholder;
                console.error('Error loading receiver image:', currentPair.receiverImage.path);
            };
            
            // Enable download button
            saveReceiverBtn.style.opacity = '1';
            saveReceiverBtn.style.pointerEvents = 'auto';
            saveReceiverBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = currentPair.receiverImage.path;
                link.download = `receiver_image_${currentPair.productId}.jpg`;
                link.click();
            };
        } else {
            receiverImage.src = missingImagePlaceholder;
            receiverImage.style.opacity = '0.5';
            
            // Disable download button
            saveReceiverBtn.style.opacity = '0.5';
            saveReceiverBtn.style.pointerEvents = 'none';
        }
        
        // Reset zoom
        senderZoomed = false;
        receiverZoomed = false;
        senderImage.style.transform = 'scale(1)';
        receiverImage.style.transform = 'scale(1)';
        
        // Update thumbnails
        const thumbnailContainers = thumbnailBar.querySelectorAll('.thumbnail-container');
        thumbnailContainers.forEach((container, idx) => {
            container.style.border = idx === index ? '2px solid #fff' : '2px solid transparent';
            container.style.opacity = idx === index ? '1' : '0.7';
        });

        // Update navigation button visibility
        prevBtn.style.visibility = index > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = index < imagePairs.length - 1 ? 'visible' : 'hidden';

        // Scroll the active thumbnail into view
        const activeThumb = thumbnailContainers[index];
        if (activeThumb) {
            const scrollOffset = activeThumb.offsetLeft - (thumbnailBar.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            thumbnailBar.scrollTo({
                left: scrollOffset,
                behavior: 'smooth'
            });
        }
    };

    // Create thumbnails for all image pairs
    imagePairs.forEach((pair, idx) => {
        // Create container for the pair of thumbnails
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumbnail-container';
        thumbContainer.style.display = 'flex';
        thumbContainer.style.flexDirection = 'column';
        thumbContainer.style.alignItems = 'center';
        thumbContainer.style.border = idx === 0 ? '2px solid #fff' : '2px solid transparent';
        thumbContainer.style.borderRadius = '4px';
        thumbContainer.style.padding = '3px';
        thumbContainer.style.backgroundColor = '#222';
        thumbContainer.style.opacity = idx === 0 ? '1' : '0.7';
        thumbContainer.style.cursor = 'pointer';
        thumbContainer.style.transition = 'all 0.2s ease';
        
        // Create flex container for side-by-side thumbnails
        const thumbImagesContainer = document.createElement('div');
        thumbImagesContainer.style.display = 'flex';
        thumbImagesContainer.style.gap = '2px';
        
        // Create sender thumbnail
        const senderThumb = document.createElement('img');
        senderThumb.src = pair.senderImage.exists ? pair.senderImage.path : missingImagePlaceholder;
        senderThumb.style.width = '40px';
        senderThumb.style.height = '40px';
        senderThumb.style.objectFit = 'cover';
        senderThumb.style.borderRadius = '2px';
        senderThumb.style.opacity = pair.senderImage.exists ? '1' : '0.5';
        
        // Create receiver thumbnail
        const receiverThumb = document.createElement('img');
        receiverThumb.src = pair.receiverImage.exists ? pair.receiverImage.path : missingImagePlaceholder;
        receiverThumb.style.width = '40px';
        receiverThumb.style.height = '40px';
        receiverThumb.style.objectFit = 'cover';
        receiverThumb.style.borderRadius = '2px';
        receiverThumb.style.opacity = pair.receiverImage.exists ? '1' : '0.5';
        
        // Handle image error
        senderThumb.onerror = () => { senderThumb.src = missingImagePlaceholder; };
        receiverThumb.onerror = () => { receiverThumb.src = missingImagePlaceholder; };
        
        // Add thumbnails to container
        thumbImagesContainer.appendChild(senderThumb);
        thumbImagesContainer.appendChild(receiverThumb);
        
        thumbContainer.appendChild(thumbImagesContainer);
        
        // Add click handler
        thumbContainer.onclick = () => {
            updateCurrentImage(idx);
        };
        
        thumbnailBar.appendChild(thumbContainer);
    });

    // Find index of clicked product
    const startIndex = imagePairs.findIndex(pair => pair.productId === productId);
    if (startIndex !== -1) {
        updateCurrentImage(startIndex);
    } else {
        updateCurrentImage(0);
    }

    // Show navigation buttons if there are multiple image pairs
    prevBtn.style.display = imagePairs.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = imagePairs.length > 1 ? 'flex' : 'none';

    // Setup navigation
    if (imagePairs.length > 1) {
        prevBtn.onclick = () => {
            if (currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1);
            }
        };

        nextBtn.onclick = () => {
            if (currentImageIndex < imagePairs.length - 1) {
                updateCurrentImage(currentImageIndex + 1);
            }
        };

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1);
            } else if (e.key === 'ArrowRight' && currentImageIndex < imagePairs.length - 1) {
                updateCurrentImage(currentImageIndex + 1);
            }
        });
    }

    // Close modal on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
        }
    });
}

function getConditionText(val) {
  const conditions = {
    0: 'Good',
    1: 'Not OK',
    2: 'Damaged'
  };
  return conditions[Number(val)] || val;
}

function displayCondition(condition) {
  return getConditionText(parseInt(condition));
}
