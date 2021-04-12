$(function() {
    $("#id_def_skew_ratio").val(+($("#id_def_skew_ratio").val()-1).toFixed(10));
    $("#id_def_min_work_time").val(+$("#id_def_min_work_time").val()||'');

    $("label[for='id_show_past']").css("text-decoration", "line-through");
    $("#id_show_past").click(() => alert("This feature has not yet been implented"));


    $("#id_warning_acceptance").parent().info('bottom',
        `This determines when to display a warning on an assignment if you fall behind on its work schedule

        e.g: If you enter 75, then you have to complete less than 75% of an assignment's work on any day to trigger a warning

        NOTE: Warnings do not affect anything and are there just for you to see`
    );
    $("#id_def_funct_round_minute").parent().info('right',
        `If your unit of work for any assignment is "Minute," meaning it is divided up into minutes, round each day's work to the nearest multiple of 5 Minutes
        
        This is because raw minute work values look ugly (e.g: 17 Minutes, 44 Minutes)`
    );
    $("#id_ignore_ends").parent().info('right',
        `This is only relevant for assignments with a minimum work time
        
        Ignores the minimum work time for the first and last working days of all assignments in exchange for making their work distributions smoother
        
        Fixes an issue that causes you to work significantly more on the first and last working days of an assignment
        
        This is recommended to be enabled`
    );
});