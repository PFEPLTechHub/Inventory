// Declare the data variable at the global scope
var data;

window.onload = function () {
  var xhr2 = new XMLHttpRequest();
  
  // Get transaction_uid from URL
  const transaction_uid = window.location.pathname.split('/').pop();
  
  // Fetch transaction details and transaction product details
  xhr2.open("GET", "/get_form_data?transaction_uid=" + encodeURIComponent(transaction_uid), true);
  xhr2.onreadystatechange = function () {
    console.log(xhr2.responseText);
    if (xhr2.readyState == 4 && xhr2.status == 200) {
      data = JSON.parse(xhr2.responseText);
      var table = document.getElementById("mainTable");

      if (data && Array.isArray(data.transaction_details) && data.transaction_details.length > 0) {
        var firstFormData = data.transaction_details[0]; // Get the first dictionary from the list
        console.log("Full Data:", data);

        var initiationDateTime = firstFormData["InitiationDate"];
        var initiationDate = initiationDateTime ? initiationDateTime.split(" ")[0] : "Loading Initiation Date ...";

        var CompletionDate = firstFormData["CompletionDate"];
        if (data.transaction_details.length > 1) {
          for (i = 0; i < data.transaction_details.length; i++) {
            let allComp = data.transaction_details[i];
            var CompletionDateTime = allComp["CompletionDate"];
            if (CompletionDateTime != "0") {
              CompletionDate = CompletionDateTime.toString().split(" ")[0];
              break;
            }
            console.log("CD: ", CompletionDateTime);
          }
          if (CompletionDateTime == "0") {
            CompletionDate = "N/A";
          }
        }

        // Default values for stages
        var stage1 = "Pending";
        var stage2 = "Pending";
        var stage3 = "Pending";
        var stage4 = "Pending";

        // Helper function to normalize approval values
        function normalizeApproval(val) {
          if (val === true || val === 1 || val === "1") return 1;
          if (val === false || val === 0 || val === "0") return 0;
          if (val === 2 || val === "2") return 2;
          if (val === null || val === undefined || val === "-") {
            console.warn("Approval field is null/undefined, defaulting to 0:", val);
            return 0; // Default to 0 instead of null
          }
          const parsed = parseInt(val);
          if (isNaN(parsed)) {
            console.warn("Unexpected value for approval field, defaulting to 0:", val, typeof val);
            return 0; // Default to 0 instead of null
          }
          return parsed;
        }

        // Updated stage calculation function using if-else
        function stages(firstFormData) {
          console.log("Stage calculation for firstFormData:", firstFormData);
          console.log("Raw values - ApprovalToSend:", firstFormData["ApprovalToSend"], 
                      "ApprovalToSend:", typeof firstFormData["ApprovalToSend"]);
          console.log("Raw values - ApprovalToReceive:", firstFormData["ApprovalToReceive"], 
                      "ApprovalToReceive:", typeof firstFormData["ApprovalToReceive"]);
          console.log("Raw values - IsReceive:", firstFormData["IsReceive"], 
                      "IsReceive:", typeof firstFormData["IsReceive"]);

          var approvalToSend = normalizeApproval(firstFormData["ApprovalToSend"]);
          var approvalToReceive = normalizeApproval(firstFormData["ApprovalToReceive"]);
          var isReceive = normalizeApproval(firstFormData["IsReceive"]);
          console.log("Normalized values - approvalToSend:", approvalToSend, 
                      "approvalToReceive:", approvalToReceive, 
                      "isReceive:", isReceive);

          // Use if-else chain to determine stages
          if (approvalToSend === 0 && approvalToReceive === 0 && isReceive === 0) {
            // 1) Send (Stage 1)
            stage1 = "Completed";
            stage2 = "Pending";
            stage3 = "Pending";
            stage4 = "Pending";
          } else if (approvalToSend === 1 && approvalToReceive === 0 && isReceive === 0) {
            // 2) Send Approved (Stage 2)
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Pending";
            stage4 = "Pending";
          } else if (approvalToSend === 1 && approvalToReceive === 0 && isReceive === 1) {
            // 3) Received (Stage 3)
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Completed";
            stage4 = "Pending";
          } else if (approvalToSend === 1 && approvalToReceive === 1 && isReceive === 1) {
            // 4) Received Approved (Stage 4)
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Completed";
            stage4 = "Completed";
          } else if (approvalToSend === 2 && approvalToReceive === 0 && isReceive === 0) {
            // 5) Send Disapproved (Stage 2)
            stage1 = "Completed";
            stage2 = "Disapproved";
            stage3 = "Pending";
            stage4 = "Pending";
          } else if (approvalToSend === 1 && approvalToReceive === 2 && isReceive === 1) {
            // 6) Received Disapproved (Stage 4)
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Completed";
            stage4 = "Disapproved";
          } else if (approvalToSend === 1 && approvalToReceive === 0 && isReceive === 2) {
            // 7) Not Received (Stage 3)
            stage1 = "Completed";
            stage2 = "Completed";
            stage3 = "Disapproved";
            stage4 = "Pending";
          } else {
            // Default case for unexpected values
            console.warn("Unexpected combination of approval values:", 
                         approvalToSend, approvalToReceive, isReceive);
            stage1 = "Pending";
            stage2 = "Pending";
            stage3 = "Pending";
            stage4 = "Pending";
          }
        }
        stages(firstFormData);

        // Update page with transaction details
        document.getElementById("formNo").textContent = firstFormData["Transaction_uid"] || "Loading Form ID ...";
        document.getElementById("ewaybillno").textContent = firstFormData["EwayBillNo"] || "Loading Eway Bill No ...";
        document.getElementById("Sender").textContent = firstFormData["SenderName"] || "Loading From Person ...";
        document.getElementById("Source").textContent = firstFormData["SourceName"] || firstFormData["Source"] || "Loading From Project ...";
        document.getElementById("Receiver").textContent = firstFormData["ReceiverName"] || "Loading To Person ...";
        document.getElementById("Destination").textContent = firstFormData["DestinationName"] || firstFormData["Destination"] || "Loading To Project ...";
        document.getElementById("InitiationDate").textContent = initiationDate;
        document.getElementById("CompletionDate").textContent = CompletionDate;

        // Set Sender Manager and Receiver Manager from project_managers
        if (data.project_managers && Array.isArray(data.project_managers)) {
            var sourceValue = firstFormData['Source'] || '';
            var destinationValue = firstFormData['Destination'] || '';
            
            console.log("=== MANAGER LOOKUP DEBUG ===");
            console.log("Source value:", sourceValue, typeof sourceValue, "Destination value:", destinationValue, typeof destinationValue);
            console.log("Project managers array:", data.project_managers);
            console.log("Available project IDs:", data.project_managers.map(pm => ({id: pm.project_id, name: pm.Projects, manager: pm.ManagerName || pm.Manager})));
            
            // Check if the source and destination IDs exist in the project_managers array
            const sourceExists = data.project_managers.some(pm => String(pm.project_id) === String(sourceValue));
            const destinationExists = data.project_managers.some(pm => String(pm.project_id) === String(destinationValue));
            console.log("Source project exists in managers array:", sourceExists);
            console.log("Destination project exists in managers array:", destinationExists);
            console.log("=============================");
            
            var senderManagerName = '';
            var receiverManagerName = '';
            var senderMatchFound = false;
            var receiverMatchFound = false;
            
            for (var i = 0; i < data.project_managers.length; i++) {
                var projectManager = data.project_managers[i];
                console.log("Comparing project_id:", projectManager.project_id, typeof projectManager.project_id, "with source:", sourceValue, typeof sourceValue, "and destination:", destinationValue, typeof destinationValue);
                console.log("Project name:", projectManager.Projects, "Manager:", projectManager.ManagerName || projectManager.Manager);
                
                // Compare using project_id instead of Projects text
                if (String(projectManager.project_id) === String(sourceValue)) {
                    senderManagerName = projectManager.ManagerName || projectManager.Manager;
                    senderMatchFound = true;
                    console.log("Matched sender manager:", senderManagerName);
                }
                if (String(projectManager.project_id) === String(destinationValue)) {
                    receiverManagerName = projectManager.ManagerName || projectManager.Manager;
                    receiverMatchFound = true;
                    console.log("Matched receiver manager:", receiverManagerName);
                }
            }
            if (!senderMatchFound) {
                console.warn("No match found for sender manager. Source:", sourceValue, "Project options:", data.project_managers.map(pm => pm.Projects));
                console.warn("Available project IDs:", data.project_managers.map(pm => pm.project_id));
                console.warn("Looking for project ID:", sourceValue, "Type:", typeof sourceValue);
            }
            if (!receiverMatchFound) {
                console.warn("No match found for receiver manager. Destination:", destinationValue, "Project options:", data.project_managers.map(pm => pm.Projects));
                console.warn("Available project IDs:", data.project_managers.map(pm => pm.project_id));
                console.warn("Looking for project ID:", destinationValue, "Type:", typeof destinationValue);
            }
            
            // Fallback: If no exact match found, try to use the first available manager
            if (!senderManagerName && data.project_managers.length > 0) {
                console.warn("Using fallback for sender manager - no exact match found");
                senderManagerName = data.project_managers[0].ManagerName || data.project_managers[0].Manager;
            }
            if (!receiverManagerName && data.project_managers.length > 1) {
                console.warn("Using fallback for receiver manager - no exact match found");
                receiverManagerName = data.project_managers[1].ManagerName || data.project_managers[1].Manager;
            }
            
            document.getElementById("Sender-manager").textContent = senderManagerName || 'Manager not available';
            document.getElementById("Receiver-manager").textContent = receiverManagerName || 'Manager not available';
        } else {
            document.getElementById("Sender-manager").textContent = 'Manager not available';
            document.getElementById("Receiver-manager").textContent = 'Manager not available';
        }

        // Update stage elements and add appropriate classes
        function updateStageElement(id, status) {
            var element = document.getElementById(id);
            element.textContent = status;
            // Remove all color styling → keep browser default (usually black)
            element.style.color = "";
        }

        
        updateStageElement("Stage1", stage1);
        updateStageElement("Stage2", stage2);
        updateStageElement("Stage3", stage3);
        updateStageElement("Stage4", stage4);

        // Merging transaction_product_details with transaction_details
        var mergedData = data.transaction_details.map(function (transaction) {
          var matchingProducts = data.transaction_product_details.filter(function (product) {
            return product.Transaction_uid === transaction.Transaction_uid;
          });

          transaction.products = matchingProducts;
          return transaction;
        });

        // Clear table rows except header
        while (table.rows.length > 1) {
          table.deleteRow(1);
        }

        // For each transaction, create a row for each product
        var rowIndex = 0;
        mergedData.forEach(function (transaction) {
          var approvalToSend = normalizeApproval(transaction["ApprovalToSend"]);
          var approvalToReceive = normalizeApproval(transaction["ApprovalToReceive"]);
          
          if (transaction.products.length === 0) {
            var newRow = table.insertRow();
            newRow.insertCell(0).textContent = ++rowIndex;

            var statusCell = newRow.insertCell(1);
            var statusLabel = document.createElement("label");
            if (approvalToSend === 0) {
              statusLabel.textContent = "Disapproved by Source Manager";
            } else if (approvalToSend === 1 && approvalToReceive === 0) {
              statusLabel.textContent = "Waiting For Approval to Receive";
            } else if (approvalToSend === 1 && approvalToReceive === 1) {
              statusLabel.textContent = "Transaction Complete";
            } else {
              statusLabel.textContent = "Waiting For Approval to Send";
            }
            statusCell.appendChild(statusLabel);

            for (var i = 0; i < 8; i++) {
              newRow.insertCell(i + 2).textContent = "";
            }
          } else {
            transaction.products.forEach(function (product) {
              var newRow = table.insertRow();
              newRow.insertCell(0).textContent = ++rowIndex;

              var statusCell = newRow.insertCell(1);
              var statusLabel = document.createElement("label");
              if (approvalToSend === 0) {
                statusLabel.textContent = "Disapproved by Source Manager";
              } else if (approvalToSend === 1 && approvalToReceive === 0) {
                statusLabel.textContent = "Waiting For Approval to Receive";
              } else if (approvalToSend === 1 && approvalToReceive === 1) {
                statusLabel.textContent = "Transaction Complete";
              } else {
                statusLabel.textContent = "Waiting For Approval to Send";
              }
              statusCell.appendChild(statusLabel);
              newRow.dataset.productId = product.ProductID;

              newRow.insertCell(2).textContent = product.Category;
              newRow.insertCell(3).textContent = product.Name;
              newRow.insertCell(4).textContent = product.Make;
              newRow.insertCell(5).textContent = product.Model;
              newRow.insertCell(6).textContent = displayCondition(product.SenderCondition);
              newRow.insertCell(7).textContent = product.SenderRemark;

              var senderImageCell = newRow.insertCell(8);
              var senderExt = product.SenderImage;
              if (senderExt && senderExt !== "-") {
                  senderImageCell.innerHTML = `<span style="color: green; font-size: 20px; cursor: pointer;">✅</span>`;
                  senderImageCell.style.cursor = 'pointer';
                  senderImageCell.addEventListener('click', () => {
                      OpenCarousel(product.ProductID, 'sender');
                  });
              } else {
                  senderImageCell.innerHTML = `<span style="color: black; font-size: 16px;">-</span>`;
              }


              newRow.insertCell(9).textContent = (product.ReceiverCondition !== null && product.ReceiverCondition !== undefined && product.ReceiverCondition !== "") ? displayCondition(product.ReceiverCondition) : "-";
              newRow.insertCell(10).textContent = (product.ReceiverRemark !== null && product.ReceiverRemark !== undefined && product.ReceiverRemark !== "") ? product.ReceiverRemark : "-";

              var receiverImageCell = newRow.insertCell(11);
              var receiverExt = product.ReceiverImage;
              if (receiverExt && receiverExt !== "-") {
                  receiverImageCell.innerHTML = `<span style="color: green; font-size: 20px; cursor: pointer;">✅</span>`;
                  receiverImageCell.style.cursor = 'pointer';
                  receiverImageCell.addEventListener('click', () => {
                      OpenCarousel(product.ProductID, 'receiver');
                  });
              } else {
                  receiverImageCell.innerHTML = `<span style="color: black; font-size: 16px;">-</span>`;
              }
            });
          }
        });
      }
    }
  };
  xhr2.send();
};

// Add displayCondition and getConditionText functions
function getConditionText(val) {
  const conditions = {
    0: 'Good',
    1: 'Not OK',
    2: 'Damaged'
  };
  return conditions[val] || val;
}

function displayCondition(condition) {
  return getConditionText(parseInt(condition));
}

// Function to check if image exists by trying to load it
function checkImageExists(imagePath) {
    return new Promise((resolve) => {
        const testImg = new Image();
        testImg.onload = function() {
            console.log(`[DEBUG] ✅ Image exists: ${imagePath}`);
            resolve({ exists: true, path: imagePath });
        };
        testImg.onerror = function() {
            console.warn(`[DEBUG] ❌ Image does not exist: ${imagePath}`);
            resolve({ exists: false, path: imagePath, error: 'Image not found' });
        };
        testImg.src = imagePath;
    });
}

// Add OpenCarousel function
async function OpenCarousel(productId, mode) {
    if (typeof caches !== 'undefined') {
        caches.keys().then(function(names) {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }
    
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

    const formNo = document.getElementById('formNo').textContent;

    let images = [];
    if (mode === 'sender') {
        const productIds = [];
        const table = document.getElementById('mainTable');
        const rows = table.querySelectorAll('tr');
        
        rows.forEach((row, index) => {
            if (index !== 0) {
                const pid = row.getAttribute('data-product-id');
                if (pid) {
                    productIds.push(pid);
                }
            }
        });

        // Create images array and verify each image exists
        images = [];
        for (const pid of productIds) {
            // Try multiple image formats
            const possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
            let imageFound = false;
            
            for (const ext of possibleExtensions) {
                const imagePath = `/static/Images/${formNo}/${pid}_send.${ext}`;
                console.log(`[DEBUG] Checking sender image: ${imagePath}`);
                
                const imageCheck = await checkImageExists(imagePath);
                if (imageCheck.exists) {
                    console.log(`[DEBUG] ✅ Found sender image: ${imagePath}`);
                    images.push({
                        path: imagePath,
                        productId: pid,
                        isValid: true
                    });
                    imageFound = true;
                    break;
                }
            }
            
            if (!imageFound) {
                console.warn(`[DEBUG] ❌ No sender image found for product ${pid} in form ${formNo}`);
                // Still add to array but mark as invalid
                images.push({
                    path: `/static/Images/${formNo}/${pid}_send.jpg`, // Default path for error display
                    productId: pid,
                    isValid: false,
                    error: `No image file found for product ${pid} in form ${formNo}`
                });
            }
        }
    } else {
        const productIds = [];
        const table = document.getElementById('mainTable');
        const rows = table.querySelectorAll('tr');
        
        rows.forEach((row, index) => {
            if (index !== 0) {
                const pid = row.getAttribute('data-product-id');
                if (pid) {
                    productIds.push(pid);
                }
            }
        });

        // Create images array and verify each image exists
        images = [];
        for (const pid of productIds) {
            // Try multiple image formats
            const possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
            let imageFound = false;
            
            for (const ext of possibleExtensions) {
                const imagePath = `/static/Images/${formNo}/${pid}_receive.${ext}`;
                console.log(`[DEBUG] Checking receiver image: ${imagePath}`);
                
                const imageCheck = await checkImageExists(imagePath);
                if (imageCheck.exists) {
                    console.log(`[DEBUG] ✅ Found receiver image: ${imagePath}`);
                    images.push({
                        path: imagePath,
                        productId: pid,
                        isValid: true
                    });
                    imageFound = true;
                    break;
                }
            }
            
            if (!imageFound) {
                console.warn(`[DEBUG] ❌ No receiver image found for product ${pid} in form ${formNo}`);
                // Still add to array but mark as invalid
                images.push({
                    path: `/static/Images/${formNo}/${pid}_receive.jpg`, // Default path for error display
                    productId: pid,
                    isValid: false,
                    error: `No image file found for product ${pid} in form ${formNo}`
                });
            }
        }
    }

    // Filter out images that don't exist and show warning if needed
    const validImages = images.filter(img => img.isValid);
    const invalidImages = images.filter(img => !img.isValid);
    
    if (invalidImages.length > 0) {
        console.warn(`[DEBUG] ${invalidImages.length} images not found:`, invalidImages.map(img => img.error));
    }
    
    if (validImages.length === 0) {
        console.error('[DEBUG] No valid images found for carousel');
        alert(`No images found for ${mode} mode. Please check if images have been uploaded.`);
        return;
    }
    
    // Use only valid images for the carousel
    images = validImages;

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

    const actionBtns = document.createElement('div');
    actionBtns.style.display = 'flex';
    actionBtns.style.gap = '20px';
    actionBtns.style.marginLeft = 'auto';

    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '⬇️';
    saveBtn.style.fontSize = '24px';
    saveBtn.style.color = 'white';
    saveBtn.style.background = 'none';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.padding = '10px';
    saveBtn.title = "Download image";
    actionBtns.appendChild(saveBtn);

    topBar.appendChild(actionBtns);

    const mainContent = document.createElement('div');
    mainContent.style.flex = '1';
    mainContent.style.display = 'flex';
    mainContent.style.alignItems = 'center';
    mainContent.style.justifyContent = 'center';
    mainContent.style.position = 'relative';
    mainContent.style.padding = '20px';

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

    const imageContainer = document.createElement('div');
    imageContainer.style.maxWidth = '65%';
    imageContainer.style.maxHeight = 'calc(100vh - 200px)';
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.position = 'relative';
    imageContainer.style.margin = '0 auto';
    mainContent.appendChild(imageContainer);

    const thumbnailBar = document.createElement('div');
    thumbnailBar.style.height = '80px';
    thumbnailBar.style.backgroundColor = 'transparent';
    thumbnailBar.style.display = 'flex';
    thumbnailBar.style.alignItems = 'center';
    thumbnailBar.style.justifyContent = 'center';
    thumbnailBar.style.gap = '8px';
    thumbnailBar.style.padding = '10px';
    thumbnailBar.style.position = 'absolute';
    thumbnailBar.style.bottom = '0';
    thumbnailBar.style.left = '0';
    thumbnailBar.style.right = '0';
    thumbnailBar.style.overflowX = 'auto';
    thumbnailBar.style.scrollBehavior = 'smooth';
    thumbnailBar.style.whiteSpace = 'nowrap';

    modal.appendChild(topBar);
    modal.appendChild(mainContent);
    modal.appendChild(thumbnailBar);
    modal.appendChild(prevBtn);
    modal.appendChild(nextBtn);
    document.body.appendChild(modal);

    let currentImageIndex = 0;
    let isZoomed = false;

    const updateCurrentImage = (index, images) => {
        currentImageIndex = index;
        const img = images[index];
        
        const mainImg = document.createElement('img');
        mainImg.style.maxWidth = '100%';
        mainImg.style.maxHeight = '75vh';
        mainImg.style.objectFit = 'contain';
        mainImg.style.transition = 'transform 0.3s';
        mainImg.style.cursor = 'zoom-in';
        
        mainImg.onerror = function() {
            console.error('=== IMAGE LOADING ERROR ===');
            console.error('Failed to load image:', img.path);
            console.error('Image loading error for product:', img.productId);
            console.error('Mode:', mode);
            console.error('Form number:', formNo);
            console.error('================================');
            
            this.onerror = null;
            this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
            
            // Show detailed error message in the image container
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                    <h3 style="color: #ff6b6b;">⚠️ Image Loading Failed</h3>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <p><strong>Path:</strong> ${img.path}</p>
                        <p><strong>Product ID:</strong> ${img.productId}</p>
                        <p><strong>Mode:</strong> ${mode}</p>
                        <p><strong>Form:</strong> ${formNo}</p>
                    </div>
                    <p style="color: #ffd93d;">This image may not have been uploaded yet or the file path is incorrect.</p>
                    <button onclick="window.location.reload()" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                        🔄 Refresh Page
                    </button>
                </div>
            `;
            imageContainer.innerHTML = '';
            imageContainer.appendChild(errorDiv);
        };
        
        mainImg.onload = function() {
            console.log('Successfully loaded image:', img.path);
        };
        
        // Add cache-busting parameter to prevent browser caching issues
        const cacheBuster = new Date().getTime();
        const separator = img.path.includes('?') ? '&' : '?';
        mainImg.src = img.path + separator + 't=' + cacheBuster;
        
        imageContainer.innerHTML = '';
        imageContainer.appendChild(mainImg);
        
        isZoomed = false;
        
        saveBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = img.path;
            link.download = `image_${img.productId}.jpg`;
            link.click();
        };
        
        const thumbs = thumbnailBar.querySelectorAll('.thumb-container');
        thumbs.forEach((thumb, idx) => {
            if (idx === index) {
                thumb.style.border = '2px solid #fff';
                thumb.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
            } else {
                thumb.style.border = '2px solid transparent';
                thumb.style.boxShadow = 'none';
            }
        });

        prevBtn.style.visibility = index > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = index < images.length - 1 ? 'visible' : 'hidden';

        const activeThumb = thumbs[index];
        if (activeThumb) {
            const scrollOffset = activeThumb.offsetLeft - (thumbnailBar.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            thumbnailBar.scrollLeft = scrollOffset;
        }
    };

    images.forEach((img, idx) => {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumb-container';
        thumbContainer.style.position = 'relative';
        thumbContainer.style.width = '60px';
        thumbContainer.style.height = '60px';
        thumbContainer.style.marginRight = '8px';
        thumbContainer.style.borderRadius = '4px';
        thumbContainer.style.border = idx === 0 ? '2px solid #fff' : '2px solid transparent';
        thumbContainer.style.cursor = 'pointer';
        thumbContainer.style.transition = 'all 0.2s ease';
        
        const thumbImg = document.createElement('img');
        thumbImg.src = img.path;
        thumbImg.style.width = '100%';
        thumbImg.style.height = '100%';
        thumbImg.style.objectFit = 'cover';
        thumbImg.style.borderRadius = '4px';
        thumbImg.style.opacity = idx === 0 ? '1' : '0.6';
        thumbImg.style.transition = 'all 0.2s ease';
        
        thumbImg.onerror = function() {
            console.error('Failed to load thumbnail:', img.path);
            this.onerror = null;
            this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        };
        
        thumbContainer.appendChild(thumbImg);
        thumbContainer.onclick = () => {
            updateCurrentImage(idx, images);
        };
        
        thumbnailBar.appendChild(thumbContainer);
    });

    const startIndex = images.findIndex(img => img.productId === productId);
    if (startIndex !== -1) {
        updateCurrentImage(startIndex, images);
    } else {
        updateCurrentImage(0, images);
    }

    prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = images.length > 1 ? 'flex' : 'none';

    if (images.length > 1) {
        prevBtn.onclick = () => {
            if (currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1, images);
            }
        };

        nextBtn.onclick = () => {
            if (currentImageIndex < images.length - 1) {
                updateCurrentImage(currentImageIndex + 1, images);
            }
        };

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
                updateCurrentImage(currentImageIndex - 1, images);
            } else if (e.key === 'ArrowRight' && currentImageIndex < images.length - 1) {
                updateCurrentImage(currentImageIndex + 1, images);
            }
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
        }
    });
}