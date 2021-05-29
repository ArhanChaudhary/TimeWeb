/* 
This file includes the code for:

Trimming trailing zeros on form fields
Crossing out an unfinished setting
Info buttons

This only runs on settings.html
*/
$(function() {
    gtag("event","settings_view");
    $("#id_def_skew_ratio").val(+($("#id_def_skew_ratio").val()-1).toFixed(10)).prop("required", false);
    $("#id_def_min_work_time").val(+$("#id_def_min_work_time").val()||'');

    $("label[for='id_show_past']").css("text-decoration", "line-through");
    $("#id_show_past").click(() => alert("This feature has not yet been implented"));

    $("#id_warning_acceptance").parent().info('bottom',
        `Determines when to display a warning on an assignment if you fall behind on an assignment's work schedule

        e.g: If you enter 75, then you have to complete less than 75% of an assignment's work on any day to trigger a warning

        NOTE: Warnings do not affect anything and are there just for you to see`
    );
    $("#id_def_funct_round_minute").parent().info('right',
        `If your unit of work for any assignment is "Minute," meaning it is divided up into minutes, round each day's work to the nearest multiple of 5 Minutes
        
        This is because raw minute work values look ugly (e.g: 17 Minutes, 49 Minutes)`
    );
    $("#id_ignore_ends").parent().info('right',
        `Only relevant for assignments with a minimum work time
        
        Ignores the minimum work time for the first and last working days of all assignments in exchange for making their work distributions smoother
        
        It does so by fixing an issue that causes you to work significantly more on the first and last working days of an assignment
        
        This is recommended to be enabled`
    );
    $("#reset-button").click(function() {
        $("#id_warning_acceptance").val(50);
        $("#id_def_min_work_time").val("");
        $("#id_def_skew_ratio").val(0);
        $("#break-days-wrapper input").prop("checked", false);
        $("#id_def_funct_round_minute").prop("checked", false);
        $("#id_ignore_ends").prop("checked", false);
        $("#id_show_progress_bar").prop("checked", false);
        $("#id_show_past").prop("checked", true);
        $("#id_color_priority").prop("checked", true);
        $("#id_text_priority").prop("checked", true);
        $("#id_highest_priority_color").val("#E25B50").trigger("input");
        $("#id_lowest_priority_color").val("#84C841").trigger("keydown");
    });
    $("form").submit(function() {
        $("#id_def_skew_ratio").val($("#id_def_skew_ratio").val()||0);
    });
});