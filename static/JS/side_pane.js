// In your external JavaScript file (your_script.js)
document.addEventListener("DOMContentLoaded", function() {

    // Removed closeOffcanvas function as data-bs-dismiss="offcanvas" handles it directly

    document.getElementById("sendItemsBtn").addEventListener("click", function() {
        window.location.href = sendItemsUrl;
    });
    document.getElementById("receiveItemsBtn").addEventListener("click", function() {
        window.location.href = receiveItemsUrl;
    });
    document.getElementById("approveItemsBtn").addEventListener("click", function() {
        window.location.href = approveItemsUrl;
    });
    document.getElementById("transactionProgressBtn").addEventListener("click", function() {
        window.location.href = transactionProgressUrl;
    });
    document.getElementById("transactionHistoryBtn").addEventListener("click", function() {
        window.location.href = transactionHistoryUrl;
    });
    document.getElementById("myInventoryBtn").addEventListener("click", function() {
        window.location.href = myInventoryUrl;
    });
    document.getElementById("projectInventoryBtn").addEventListener("click", function() {
        window.location.href = projectInventoryUrl;
    });
    document.getElementById("totalInventoryBtn").addEventListener("click", function() {
        window.location.href = totalInventoryUrl;
    });
        const inventoryMapBtn = document.getElementById("inventoryMapBtn");
    if (inventoryMapBtn) {
        inventoryMapBtn.addEventListener("click", function() {
            window.open("https://inventory-map.vercel.app/", "_blank");
        });
    }
    document.getElementById("logoutBtn").addEventListener("click", function() {
        window.location.href = logoutBtnUrl;
    });
    document.getElementById("homepageBtn").addEventListener("click", function() {
        window.location.href = homepageBtnUrl;
    });
    document.getElementById("additemBtn").addEventListener("click", function() {
        window.location.href = additemBtnUrl;
    });
    document.getElementById("deleteitemBtn").addEventListener("click", function() {
        window.location.href = deleteitemBtnUrl;
    });

    const emppanel = document.getElementById("emppanel");
    if (emppanel) {
        emppanel.addEventListener("click", function() {
            window.location.href = emppanelBtnUrl;
        });
    }


    const ewaybillbutton = document.getElementById("ewaybillbutton");
    if (ewaybillbutton) {
        ewaybillbutton.addEventListener("click", function() {
            window.location.href = ewaybillUrl;
        });
    }


    const myprofileBtn = document.getElementById("myprofileBtn");
    if (myprofileBtn) {
        myprofileBtn.addEventListener("click", function() {
            window.location.href = myprofileBtnUrl;
        });
    }


    const uniqueprojects = document.getElementById("uniqueprojects");
    if (uniqueprojects) {
        uniqueprojects.addEventListener("click", function() {
            window.location.href = uniqueprojectsBtnUrl;
        });
    }


    const managers_panel = document.getElementById("managers_panel");
    if (managers_panel) {
        managers_panel.addEventListener("click", function() {
            window.location.href = managers_panelBtnUrl;
        });
    }


});
