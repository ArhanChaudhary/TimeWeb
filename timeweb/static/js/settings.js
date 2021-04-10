$(function() {
    $("#id_def_skew_ratio").val(+($("#id_def_skew_ratio").val()-1).toFixed(10));

    $("label[for='id_show_past']").css("text-decoration", "line-through");
    $("#id_show_past").click(() => alert("This feature has not yet been implented"));


});