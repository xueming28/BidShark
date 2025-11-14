//sidebar active item
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});
document.querySelector('.filter-button').addEventListener('click', (e) => {
    document.querySelector('.filter-content').classList.toggle("show");
})
window.onclick = function(event) {
    if (!event.target.closest('.filter-button') && !event.target.closest('.filter-content')) {
        var dropdowns = document.getElementsByClassName("filter-content");
        for (let i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
};