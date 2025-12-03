// Preview image before upload
document.getElementById("file-input").addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
        document.getElementById("previewImage").src = URL.createObjectURL(file);
    }
});

// Handle submit
function saveProfile() {
    const username = document.getElementById("username").value.trim();
    const bio = document.getElementById("bio").value.trim();

    if (!username) {
        alert("Username is required");
        return;
    }

    alert("Profile saved!");

    // Redirect to another page
window.location.href = "Home.html";
}
