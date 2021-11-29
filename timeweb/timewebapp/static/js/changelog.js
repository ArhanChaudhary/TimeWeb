document.addEventListener("DOMContentLoaded", function() {
    $("#doc-container").css("counter-reset", `major-category-counter ${$(".major-category").length + 1}`);
    $(".major-category").each(function() {
        const $major_category = $(this); 
    })
});