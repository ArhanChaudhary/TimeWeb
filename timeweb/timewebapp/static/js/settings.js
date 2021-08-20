document.addEventListener("DOMContentLoaded", function() {
    gtag("event","settings_view");
    $("#id_def_skew_ratio").val(mathUtils.precisionRound($("#id_def_skew_ratio").val()-1, 10)).prop("required", false);
    $("#id_def_min_work_time").val(+$("#id_def_min_work_time").val()||'');
    $("#reset-settings-button").click(function() {
        $("#id_def_min_work_time").val("");
        $("#id_def_skew_ratio").val(0);
        $("#break-days-wrapper input").prop("checked", false);
        $("#id_def_funct_round_minute").prop("checked", false);
        $("#id_ignore_ends").prop("checked", false);
        $("#id_show_progress_bar").prop("checked", false);
        $("#id_color_priority").prop("checked", true);
        $("#id_text_priority").prop("checked", true);
        $("#id_highest_priority_color")[0].jscolor.fromString("#E25B50");
        $("#id_lowest_priority_color")[0].jscolor.fromString("#84C841");
        $("#id_background_image").val("");
        $("#id_tag_position").val("Middle");
    });
    // verbose name doesnt work on tag position for literally no reason
    $("label[for=\"id_tag_position\"]").html("Assignment Tag Position");
    $("#id_dark_mode").click(function(e) {
        e.preventDefault();
        $.alert({title: "Dark mode hasn't yet been implemented"});
    });
    $("table input:not([name^=\"background_image\"]):not([name=\"def_break_days\"]):not(.jscolor)").each(function() {
        $("<label class=\"hitbox-label\"></label>").insertAfter($(this)).attr("for", $(this).attr("id"));
    });
    $("form").submit(function() {
        $("#id_def_skew_ratio").val(mathUtils.precisionRound($("#id_def_skew_ratio").val()+1, 10));
        $("#submit-settings-button").attr("disabled", true);
    });
});