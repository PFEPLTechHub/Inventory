document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("back-button").addEventListener("click", function() {
        const targetUrl = this.getAttribute("data-target");
        window.location.href = targetUrl;
    });
});
