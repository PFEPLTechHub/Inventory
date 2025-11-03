document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    // Fetch the form data
    const formData = new FormData(this);

    // Send a POST request to the server
    fetch("/login", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())  // Always parse response as JSON
    .then(data => {
        // Now handle the response based on the status
        if (data.status === "fail") {
            // Show the message from the response
            floatingMessageBox(data.message, 'red');
        } else if (data.status === "success") {
            // Redirect to the homepage
            window.location.href = "/homepage";
        }
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle any errors that occurred during the fetch or in the response
        floatingMessageBox("An error occurred. Please try again later.", 'red');
    });
});
