$(function() {
    // Load in load data
    let dat = JSON.parse(document.getElementById("load-data").textContent);
    let [warning_acceptance, def_min_work_time, def_skew_ratio, def_nwd, def_minute_gv, ignore_ends, show_progress_bar, show_past, translatez, priority_display] = dat[0];
    def_minute_gv = def_minute_gv||'';
    //
    // Form functionality
    //
    function showForm(show_instantly=false) {
        if (show_instantly) {
            $('#overlay').show().addClass("transition-form");
        } else {
            $("#overlay").fadeIn(300).addClass("transition-form");
        }
        // Make rest of page untabbable
        $(".assignment, .graph, #menu, #image-new-container, a, button:not(#form-wrapper button), .graph-container input").attr("tabindex","-1");
        $('#id_works').val((+$('#id_works').val()).toFixed(2)); // Ensure #id_works has two decimal places because 0 displays as 0.0
    }
    function hideForm(hide_instantly=false) {
        if (hide_instantly) {
            $("#overlay").hide().removeClass("transition-form");
            $(".error-note, .invalid").remove(); // Remove all error notes when form is exited
        } else {
            $("#overlay").fadeOut(300,function() {
                $(".invalid").removeClass("invalid");
                $(".error-note").remove();
            }).removeClass("transition-form"); // Remove all error notes when form is exited
        }
        // Make rest of page retabbable
        $("a, button:not(#form-wrapper button), .graph-container input").removeAttr("tabindex");
        $("#menu").attr("tabindex","2");
        $("#image-new-container, #user-greeting a").attr("tabindex","1");
        $(".assignment, .graph").attr("tabindex","0");
    }

    // Show new form on new assignment
    $("#image-new-container").click(function() {
        const today = new Date();
        let tomorrow = new Date();
        tomorrow.setDate(today.getDate()+1);
        // Set default values
        ['',
        
        [
            today.getFullYear(),
            ('0' + (today.getMonth() + 1)).slice(-2),
            ('0' + today.getDate()).slice(-2),
        ].join('-'),

        [
            tomorrow.getFullYear(),
            ('0' + (tomorrow.getMonth() + 1)).slice(-2),
            ('0' + tomorrow.getDate()).slice(-2),
        ].join('-'),

        'Minute','','0.00','','',def_min_work_time].forEach(function(element, index) {
            $(form_inputs[index]).val(element);
        });
        for (let nwd of Array(7).keys()) {
            $("#id_nwd_"+((nwd+6)%7)).prop("checked",def_nwd.includes(nwd));
        }
        // Set form text
        $("#new-title").html("New Assignment");
        $("#form-wrapper button").html("Create Assignment").val('');
        // Show form
        showForm();
        replaceUnit();
    });

    // Populate reentered form on modify
    $('.update-button').click(function() {
        // Set form text
        $("#new-title").html("Re-enter Assignment");
        $("#form-wrapper button").html("Modify Assignment");
        // Find which assignment in dat was clicked
        const selected_assignment = dat[$("#assignments-container").children().index($(this).parents(".assignment-container"))];
        // Define reented form fields, could have been written more efficient but it's more readable like this
        const form_data = [
            selected_assignment[0],
            selected_assignment[1],
            selected_assignment[2],
            selected_assignment[3],
            selected_assignment[4],
            selected_assignment[5][0],
            selected_assignment[8],
            selected_assignment[9]-1 ? selected_assignment[9] : '', // Grouping value displays as self if it isn't 1, else display nothing
            +selected_assignment[10] ? (selected_assignment[10]*selected_assignment[8]).toFixed(2) : '', // Minimum work time displays self if it isn't 0, else display nothing
        ];
        // Set reeneted form fields
        form_inputs.each((index, element) => $(element).val(form_data[index]));
        selected_assignment[11].forEach(nwd => $("#id_nwd_"+((+nwd+6)%7)).prop("checked",true));
        // Set button pk
        $("#form-wrapper button").val($(this).val());
        // Define old field values
        old_ctime_val = $('#id_ctime').val();
        old_funct_round_val = $('#id_funct_round').val();
        // Show form
        showForm();
    });

    // Hide form when overlay is clicked
    $("#overlay").click(function(e) {
        if (e.target !== this) {
            return
        }
        hideForm();
    });

    // Replace fields with unit when unit is "Minute"
    var old_ctime_val, old_funct_round_val;
    function replaceUnit() {
        const val = $("#id_unit").val();
        const plural = pluralize(val),
            singular = pluralize(val,1);
            
        // Replace fields
        if (val) {
            $("label[for='id_y']").text("Enter the Total amount of " + plural + " in this Assignment");
            $("label[for='id_works']").text("Enter the Total amount of " + plural + " already Completed");
            $("label[for='id_ctime']").text("Enter the Estimated amount of Time to complete each " + singular + " in Minutes");
        } else {
            $("label[for='id_y']").html("Enter the Total amount of Units in this Assignment");
            $("label[for='id_works']").html("Enter the Total amount of Units already Completed");
            $("label[for='id_ctime']").html("Enter the Estimated amount of Time to complete each Unit of Work in Minutes");
        }
        if (singular.toUpperCase() === 'MINUTE') {
            // Old values for the field when unit==="Minute" and their values are replaced with another
            old_ctime_val = $('#id_ctime').val();
            old_funct_round_val = $('#id_funct_round').val();
            // Replace with new values
            $("#id_funct_round").val(def_minute_gv);
            $("#id_ctime").val("1.00")
            // Disable field
            .prop("disabled",true).addClass("disabled-field");
            $("label[for='id_ctime']").addClass("disabled-field");
        } else {
            // Restore old values and re-enable the field
            $("#id_funct_round").val(old_funct_round_val ? (+old_funct_round_val).toFixed(2) : '');
            $("#id_ctime").val(old_ctime_val ? (+old_ctime_val).toFixed(2) : '').prop("disabled",false).removeClass("disabled-field");
            $("label[for='id_ctime']").removeClass("disabled-field");
        }
    }
    $("#id_unit").on('input',replaceUnit);

    // Add info buttons ($.info defined in template.js)
    $('label[for="id_x"], label[for="id_funct_round"], label[for="id_min_work_time"], label#nwd-label-title').append("*");
    $('label[for="id_unit"]').info('right',
        `This is how your assignment will be split and divided up
        
        e.g. If this assignment is reading a book, enter "Page"
        Try changing this name to something else if you're still confused

        If you are unsure how to split up your assignment, this is defaulted to "Minute"`
    );
    $('label[for="id_works"]').info('right',
        `The following is only relevant if you are re-entering this field

        This value is also the y-coordinate of the first point on the blue line, or the initial work input
        
        Changing this initial value will vertically translate all of your other work inputs accordingly`
    );
    $('label[for="id_funct_round"]').info('right',
        `This is the increment of work you will complete at a time
        
        For example, if you enter 3, you will only work in multiples of 3 (e.g: 6 units, 9 units, 15 units, etc)
        
        If you do not wish to use the grouping value, this is defaulted to 1`
    );
    // All form inputs, can't use "#form-wrapper input:visible" because form is initially hidden
    const form_inputs = $("#form-wrapper input:not([type='hidden']):not([name='nwd'])");

    // Auto field scrolling
    form_inputs.focus(function() {
        this.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    });

    // "$(".error-note").length" is the same thing as {% field.errors %} in the template
    if ($(".error-note").length) {
        showForm(true); // Show instantly
        replaceUnit();
    } else {
        hideForm(true); // Hide instantly
    }

    // Keybind
    $(document).keydown(function(e) {
        if (e.key === "Escape") {
            hideForm();
        }
    });

    // Custom form validity
    form_inputs.on("input",function() {
        // Reset custom form validity, without this the form invalid error shows up when there is no error
        this.setCustomValidity('');
        // Don't allow "e" in number input
        switch ($(this).attr("id")) {
            case "id_works":
            case "id_y":
            case "id_ctime":
            case "id_funct_round":
            case "id_min_work_time":
                this.validity.valid||($(this).val(''));
                break;
        }
    });
    // Sets custom error message
    form_inputs.on("invalid",function() {
        let message;
        switch ($(this).attr("id")) {
            case "id_file_sel":
                message = 'Please enter an assignment name';
                break;
            case "id_ad":
                message = 'The assignment date is either out of range or invalid';
                break;
            case "id_x":
                if ($(this).val()) {
                    message = 'The due date is either out of range or invalid';
                } else {
                    return; // Allow blank field
                }
                break;
            case "id_unit":
                message = 'Please enter a name';
                break;
            case "id_y":
            case "id_works":
            case "id_ctime":
                message = 'Please enter a value';
                break;
        }
        this.setCustomValidity(message);
    });

    // Redefine old field values when they are changed
    $("#id_ctime").on("input",function() {
        old_ctime_val = $(this).val();
    });
    $("#id_funct_round").on("input",function() {
        old_funct_round_val = $(this).val();
    });

    // Handles unloading and reloading of form
    $(window).unload(function() {
        if ($("#form-wrapper").is(":visible")) {
            // Save form data to localStorage before unload
            localStorage.setItem("form_fields",
                JSON.stringify([
                    ...form_inputs.toArray().map(field => field.value),
                    $("#form-wrapper #nwd-wrapper input").toArray().map(nwd_field => nwd_field.checked),
                ])
            );
        }
    });
    if ("form_fields" in localStorage) {
        
        // Restore form on refresh or invalid
        const pr_data = JSON.parse(localStorage.getItem("form_fields"));
        localStorage.removeItem('form_fields');
        form_inputs.each(function(index) {
            $(this).val(pr_data[index]);
        });
        $("#form-wrapper #nwd-wrapper input").each(function(index) {
            $(this).prop('checked',pr_data[9][index]);
        });
        // Define old field values if unit === "Minute"
        old_ctime_val = $('#id_ctime').val();
        old_funct_round_val = $('#id_funct_round').val();
    }
    if ("scroll" in localStorage) {
        $(window).load(function() {
            $("#content").scrollTop(localStorage.getItem("scroll"));
            localStorage.removeItem("scroll");
        });
    }
    // Enable disabled field on submit so it's sent with post
    $("#form-wrapper form").submit(function() {
        $("#id_ctime").removeAttr("disabled");
        localStorage.setItem("scroll",$("#content").scrollTop());
    });

    // Style errors if form is invalid
    $("#form-wrapper .error-note").each(function() {
        $(this).prev().children().eq(1).addClass("invalid");
        if (this.id === "error_id_x" || this.id === "error_id_works") {
            $(this).prev().prev().children().eq(1).addClass("invalid");
        }
    });
    //
    // End Form Functionality
    //

    // Returns color rgb from priority percentage
    function color(p) {
        return `rgb(${132+94*p},${200-109*p},${65+15*p})`;
    }
    const k = [1,0.95,0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.5,0.45,0.4,0.35,0.3,0.25,0.2,0.15,0.1,0.05,0,0,0];
    
    // Resolve promise when scroll is finished
    let scrollTimeout, resolver;
    function scroll() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            $("#content").off('scroll');
            resolver();
        }, 200);
    }
    // Set assignment width for transition on resize, cannot use vw or % because they aren't permormant
    let widthTimeout;
    $(window).resize(function() {
        $(".assignment").css("width",window.innerWidth-60).addClass("disable-assignment-transition");
        clearTimeout(widthTimeout);
        widthTimeout = setTimeout(function() {
            $(".assignment").removeClass("disable-assignment-transition");
        }, 200);
    });
    $(".assignment").css("width",window.innerWidth-60);

    function color_or_animate_assignment($element, index, is_element_submitted=false) {
        if ($("#animate-in").length && is_element_submitted) {
            $element.parent().animate({
                top: "0", 
                opacity: "1", 
                marginBottom: "0",
            }, 1500, "easeOutCubic");
        }
        $element.css("background",color(k[index]));
    }
    $(".assignment").each(function(index) {
        const assignment_container = $(this).parent();
        if (assignment_container.is("#animate-color, #animate-in")) {
            if ($("#animate-in").length) {
                assignment_container.css({
                    "top": 20+$("#assignments-container").offset().top + $("#assignments-container").height() - assignment_container.offset().top,
                    "opacity": "0",
                    "margin-bottom": -assignment_container.height()-10,
                });
            }
            new Promise(function(resolve) {
                $(window).load(function() {
                    let assignment_to_scroll = $("#animate-in").next();
                    if (!assignment_to_scroll.length) {
                        assignment_to_scroll = $("#animate-color, #animate-in");
                    }
                    // If #animate-in, choose next assignment to scroll to, but choose itself if there is no next assignment
                    // If #animate-color, choose self to scroll to
                    assignment_to_scroll[0].scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                    resolver = resolve;
                    $("#content").scroll(scroll);
                    scroll();
                });
            }).then(() => color_or_animate_assignment($(this), index, true)); // Arrow function to preserve "this"
        } else {
            color_or_animate_assignment($(this), index);
        }
    });

    // Ajax error function
    function error(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
        } else if (response.status == 404) {
            alert('Requested page not found, try again');
        } else if (response.status == 500) {
            alert('Internal server error. Please contact me if you see this')
        } else if (exception === 'parsererror') {
            alert('Requested JSON parse failed');
        } else if (exception === 'timeout') {
            alert('Timeout error');
        } else if (exception === 'abort') {
            alert('Request aborted');
        } else {
            alert('Uncaught Error, \n' + response.responseText);
        }
    }

    $('.delete-button').click(function() {
        if ($(document).queue().length === 0 && confirm('Are you sure you want to delete this assignment? (Press Enter)')) {
            const $this = $(this);
            const assignment_container = $($this.parents(".assignment-container"));
            new Promise(function(resolve) {
                assignment_container[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
                resolver = resolve;
                $("#content").scroll(scroll);
                scroll();
            }).then(function() {
                // Data sent to server pointing to which assignment to delete
                let data = {
                    'csrfmiddlewaretoken': csrf_token,
                    'deleted': $this.val(),
                }
                // If the data was successfully sent, delete the assignment
                const success = function() {
                    assignment_container.css({
                        // CSS doesn't allow transitions without presetting the property
                        // So, use jQuery.animate to preset and animate its property
                        "height": assignment_container.height() + 20,
                        "margin-bottom": "-10px",
                        "margin-top": "-10px",
                        "min-height": "0",
                    }).children(":first-child").css({
                        "position": "absolute",
                        "opacity": "0",
                    });
                    dat.splice($("#assignments-container").children().index($this.parents(".assignment-container")),1);
                    assignment_container.animate({height: "10px"}, 750, "easeOutCubic", () => assignment_container.remove());
                }
                // Use ajax to avoid a page reload
                $.ajax({
                    type: "POST",
                    data: data,
                    success: success,
                    error: error,
                });
            });
        }
    });

    // Hide and show estimated completion time
    $("#hide-button").click(function() {
        $(this).html($(this).html() === 'Hide' ? 'Show' : 'Hide').prev().toggle();
    });
    
    // Entire graph
    let scale,
        font_size;
    function PreventArrowScroll(e) {
        // Prevent arrow keys from scrolling
        var e = e || window.event;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    }
    $(".assignment").click(function(e) {
        var e = e || window.event;
        if ($(document).queue().length === 0 && !["IMG", "BUTTON", "CANVAS", "INPUT"].includes(e.target.tagName)) {
            let assignment = $(this);
            const graph_container = assignment.find(".graph-container"),
                not_first_click = assignment.data('not_first_click');
            if (graph_container.attr("style") && assignment.hasClass("disable-hover") /* Allow assignment to be open while it's closing */ ) {
                graph_container.animate({marginBottom:-graph_container.height()}, 750, "easeOutCubic", function() {
                    // Hide assignment when transition ends
                    assignment.css("overflow", "");
                    graph_container.removeAttr("style");
                });
                this.querySelector(".fallingarrowanimation").beginElement();
                assignment.removeClass("disable-hover").css("overflow", "hidden");
                // If no graphs are open, allow arrow scroll
                if ($(".disable-hover").length === 0) {
                    $(document).off("keydown", PreventArrowScroll);
                }
            } else {
                // Stop closing animation
                graph_container.stop();
                assignment.css("overflow", "");
                graph_container.css({"display": "","margin-bottom": ""});

                // Prevents auto scroll if a graph is open
                if ($(".disable-hover").length === 0) {
                    $(document).keydown(PreventArrowScroll);
                }
                assignment.addClass("disable-hover");
                graph_container.css("display", "block");
                this.querySelector(".risingarrowanimation").beginElement();

                let graph = this.querySelector('.graph'),
                    fixed_graph = this.querySelector('.fixed-graph'),

                    selected_assignment = dat[$("#assignments-container").children().index($(this).parents(".assignment-container"))],
                    [file_sel, ad, x, unit, y, works, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd, fixed_mode, dynamic_start, remainder_mode] = selected_assignment;
                ad = new Date(ad + " 00:00");
                x = Math.round((Date.parse(x + " 00:00") - ad) / 86400000); // Round to account for DST
                nwd = nwd.map(Number);
                y = +y;
                let mods,
                    skew_ratio_lim,
                    red_line_start_x = fixed_mode ? 0 : dynamic_start,
                    red_line_start_y = fixed_mode ? 0 : parseFloat(works[red_line_start_x - dif_assign]),
                    assign_day_of_week = ad.getDay(),
                    len_works = works.length,
                    draw_point = false,
                    y_fremainder = (y - red_line_start_y) % funct_round,
                    ignore_ends_mwt = ignore_ends && min_work_time,
                    len_nwd = nwd.length,
                    set_skew_ratio = false,
                    min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round,
                    a,
                    b,
                    cutoff_transition_value,
                    cutoff_to_use_round,
                    return_y_cutoff,
                    return_0_cutoff,
                    last_mouse_x = -1,
                    last_mouse_y = false;
                let due_date = new Date(x),
                    disyear;
                due_date.setDate(due_date.getDate() + x);
                if (ad.getFullYear() !== due_date.getFullYear()) {
                    disyear = ', %Y';
                } else {
                    disyear = '';
                }
                if (nwd.length) {
                    set_mod_days();
                }
                set_skew_ratio_lim();
                // Sets event handlers only on the assignment's first click
                if (!not_first_click) {
                    // Graph resize event handler
                    $(window).resize(() => resize(false));

                    // XML skew ratio when it is saved
                    let ajax,
                        old_skew_ratio = skew_ratio;
                    function AjaxSkewRatio() {
                        clearTimeout(ajax);
                        selected_assignment[7] = skew_ratio; // Change this so it is saved when the assignment is closed and then loaded in and reopened
                        old_skew_ratio = skew_ratio;
                        ajax = setTimeout(function() {
                            const data = {
                                'csrfmiddlewaretoken': csrf_token,
                                'skew_ratio': skew_ratio,
                                'pk': graph.getAttribute("value"),
                            }
                            // send value with skew ratio so it can be reference in backend
                            $.ajax({
                                type: "POST",
                                data: data,
                                error: error,
                            });
                        }, 1000);
                    }

                    // Up and down arrow event handler
                    $(document).keydown(function(e) {
                        var e = e || window.event;
                        if ((e.key === "ArrowUp" || e.key === "ArrowDown") && $(fixed_graph).is(":visible") && !$(document.activeElement).hasClass("sr-textbox")) {
                            const rect = fixed_graph.getBoundingClientRect();
                            if (rect.bottom - rect.height / 1.5 > 70 && rect.y + rect.height / 1.5 < window.innerHeight && !fired) {
                                fired = true;
                                whichkey = e.key;
                                ChangeSkewRatio()
                                graphtimeout = setTimeout(function() {
                                    clearInterval(graphinterval);
                                    graphinterval = setInterval(ChangeSkewRatio, 13); // Draws every frame
                                }, 500);
                            }
                        }
                    });
                    $(document).keyup(function(e) {
                        var e = e || window.event;
                        if (e.key === whichkey) {
                            fired = false;
                            clearTimeout(graphtimeout);
                            clearInterval(graphinterval);
                        }
                    });
                    let graphtimeout, // set the hold delay to a variable so it can be cleared key if the user lets go of it within 500ms
                        fired = false, // $(document).keydown( fires for every frame a key is held down. This fires it only once
                        graphinterval,
                        whichkey;
                    function ChangeSkewRatio() {
                        // Change skew ratio by +- 0.1 or cap it
                        if (whichkey === "ArrowDown") {
                            skew_ratio = (skew_ratio - 0.1).toFixed(1);
                            if (skew_ratio < 2 - skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim;
                            }
                        } else {
                            skew_ratio = (+skew_ratio + 0.1).toFixed(1);
                            if (skew_ratio > skew_ratio_lim) {
                                skew_ratio = 2 - skew_ratio_lim;
                            }
                        }
                        AjaxSkewRatio();
                        draw();
                    }
                    
                    // Setting and stopping set skew ratio using graph
                    function mousemove(e) {
                        var e = e || window.event;
                        const offset = $(fixed_graph).offset();
                        let radius = wCon / 3;
                        if (radius > 3) {
                            radius = 3;
                        } else if (radius < 2) {
                            radius = 2;
                        }
                        draw(e.pageX - offset.left + radius, e.pageY - offset.top - radius);
                    }
                    function sr_button_clicked() {
                        $(this).html("Set skew ratio using graph");
                        set_skew_ratio = false;
                        skew_ratio = old_skew_ratio;
                        draw();
                        // No need to ajax since skew ratio is the same
                    }
                    assignment.find(".sr-button").click(function() {
                        debugger;
                        $(this).html("Hover and click the graph (click this again to cancel)").one("click", sr_button_clicked);
                        $(graph).mousemove(mousemove); // enable set skew ratio if button is pressed
                        set_skew_ratio = true;
                    });
                    
                    $(graph).click(function(e) {
                        if (set_skew_ratio) {
                            set_skew_ratio = false;
                            // stop set skew ratio if canvas is clicked
                            $(this).next().find(".sr-button").html("Set skew ratio using graph").off("click", sr_button_clicked);
                            AjaxSkewRatio();
                        } else if (draw_point) {
                            $(this).off("mousemove");
                            draw_point = false;
                            last_mouse_x = -1;
                            draw();
                        } else {
                            draw_point = true;
                            $(this).mousemove(mousemove);
                            mousemove(e);
                        }
                    });

                    // Dynamically update skew ratio from textbox
                    // keydown for normal sr and keyup for delete
                    $(".sr-textbox").on("keydown paste click keyup", function(e) {
                        var e = e || window.event;
                        if (old_skew_ratio === undefined) {
                            old_skew_ratio = skew_ratio;
                        }
                        if (e.target.value) {
                            skew_ratio = e.target.value;
                            if (skew_ratio > skew_ratio_lim) {
                                skew_ratio = 2 - skew_ratio_lim;
                            } else if (skew_ratio < 2 - skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim;
                            }
                        } else {
                            skew_ratio = old_skew_ratio;
                            old_skew_ratio = undefined;
                        }
                        draw();
                    });
                    $(".sr-textbox").focusout(function(e) {
                        var e = e || window.event;
                        e.target.value = "";
                        if (old_skew_ratio !== undefined) {
                            AjaxSkewRatio();
                        }
                        old_skew_ratio = skew_ratio;
                    });
                    $(".sr-textbox").keypress(function(e) {
                        var e = e || window.event;
                        if (e.key === "Enter") {
                            e.target.blur();
                        }
                    });
                }

                // Graph logic
                function pset(x2 = false, y2 = false) {
                    let x1 = x - red_line_start_x,
                        y1 = y - red_line_start_y;
                    if (len_nwd) {
                        x1 -= Math.floor(x1 / 7) * len_nwd + mods[x1 % 7];
                    }
                    if (set_skew_ratio && x2 !== false) {
                        x2 = (x2 - 50) / wCon - red_line_start_x;
                        y2 = (height - y2 - 50) / hCon - red_line_start_y;
                        if (x2 < 0) {
                            skew_ratio = skew_ratio_lim;
                            a = 0;
                            b = y1;
                            return_y_cutoff = x1 ? 0 : -1;
                            return_0_cutoff = 1;
                            cutoff_transition_value = 0;
                            return;
                        }
                        if (len_nwd) {
                            const floorx2 = Math.floor(x2);
                            if (nwd.includes((assign_day_of_week + floorx2 + red_line_start_x) % 7)) {
                                x2 = floorx2;
                            }
                            x2 -= Math.floor(x2 / 7) * len_nwd + mods[floorx2 % 7];
                        }
                        if (x2 >= x1) {
                            // cite later http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                            a = y1 / x1;
                            b = a * (1 - x1);

                            skew_ratio = 2 - skew_ratio_lim;
                        } else {
                            if (remainder_mode) {
                                y2 -= y_fremainder;
                            }
                            // cite later http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                            a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
                            b = (y1 - x1 * x1 * a) / x1;

                            skew_ratio = (a + b) * x1 / y1;
                            if (skew_ratio > skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim;
                            } else if (skew_ratio < 2 - skew_ratio_lim) {
                                skew_ratio = 2 - skew_ratio_lim;
                            } else if (0.975 < skew_ratio && skew_ratio < 1.025) {
                                if (!x1) {
                                    a = 0;
                                    b = y1;
                                    return_y_cutoff = x1 ? 0 : -1;
                                    return_0_cutoff = 1;
                                    cutoff_transition_value = 0;
                                    return;
                                }
                                skew_ratio = 1;
                                a = 0;
                                b = y1 / x1;
                            }
                            console.log("Skew ratio: " + skew_ratio);
                        }
                    } else {
                        // cite later http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                        a = y1 * (1 - skew_ratio) / ((x1 - 1) * x1);
                        b = (y1 - x1 * x1 * a) / x1;
                    }
                    if (!Number.isFinite(a)) {
                        a = 0;
                        b = y1;
                        return_y_cutoff = x1 ? 0 : -1;
                        return_0_cutoff = 1;
                        cutoff_transition_value = 0;
                        return;
                    }
                    if (a <= 0 || a * b > 0) {
                        var funct_zero = 0;
                    } else {
                        var funct_zero = -b / a;
                    }
                    if (a >= 0) {
                        var funct_y = x1;
                    } else {
                        var funct_y = ((Math.sqrt(b * b + 4 * a * y1) - b) / a / 2).toFixed(10);
                    }
                    if (funct_round < min_work_time) {
                        cutoff_transition_value = 0;
                        if (a) {
                            cutoff_to_use_round = ((min_work_time_funct_round - b) / a / 2).toFixed(10) - 1e-10;
                            if (funct_zero < cutoff_to_use_round && cutoff_to_use_round < funct_y) {
                                let n = Math.floor(cutoff_to_use_round),
                                    prev_output;
                                for (n of [n, ++n]) {
                                    var output = funct(n, false);
                                    if (output > y) {
                                        output = y;
                                    } else if (output < 0) {
                                        output = 0;
                                    }
                                    prev_output = prev_output || output;
                                }
                                if (output - prev_output) {
                                    cutoff_transition_value = parseInt(min_work_time_funct_round - output) + parseInt(prev_output);
                                }
                            }
                        }
                    }
                    if (ignore_ends_mwt) {
                        var y_value_to_cutoff = y1;
                    } else if (funct_round < min_work_time && (!a && b < min_work_time_funct_round || a && (a > 0) === (funct_y < cutoff_to_use_round))) {
                        var y_value_to_cutoff = y1 - min_work_time_funct_round / 2;
                    } else {
                        var y_value_to_cutoff = y1 - min_work_time_funct_round + funct_round / 2;
                    }
                    if (y_value_to_cutoff > 0 && y > red_line_start_y && (a || b)) {
                        return_y_cutoff = (a ? (Math.sqrt(b * b + 4 * a * y_value_to_cutoff) - b) / a / 2 : y_value_to_cutoff / b).toFixed(10) - 1e-10;
                    } else {
                        return_y_cutoff = 0;
                    }
                    if (return_y_cutoff < 5000) {
                        if (return_y_cutoff < 1) {
                            var output = 0;
                        } else {
                            for (let n = Math.floor(return_y_cutoff); n > 0; n--) {
                                var output = funct(n, false);
                                if (output <= y - min_work_time_funct_round) {
                                    break;
                                }
                                return_y_cutoff--;
                            }
                        }
                        if (ignore_ends_mwt) {
                            const lower = [return_y_cutoff, y - red_line_start_y - output];

                            let did_loop = false;
                            for (let n = Math.ceil(return_y_cutoff); n < x1; n++) {
                                const pre_output = funct(n, false);
                                if (pre_output >= y) {
                                    break;
                                }
                                did_loop = true;
                                var output = pre_output;
                                return_y_cutoff++;
                            }
                            if (did_loop) {
                                const upper = [return_y_cutoff, y - red_line_start_y - output];
                                return_y_cutoff = [upper, lower][+(min_work_time_funct_round * 2 - lower[1] > upper[1])][0];
                            }
                        }
                    }
                    if (ignore_ends_mwt) {
                        var y_value_to_cutoff = 0;
                    } else if (funct_round < min_work_time && (!a && b < min_work_time_funct_round || a && (a > 0) === (funct_zero < cutoff_to_use_round))) {
                        var y_value_to_cutoff = min_work_time_funct_round / 2;
                    } else {
                        var y_value_to_cutoff = min_work_time_funct_round - funct_round / 2;
                    }
                    if (y_value_to_cutoff < y1 && y > red_line_start_y && (a || b)) {
                        return_0_cutoff = (a ? (Math.sqrt(b * b + 4 * a * y_value_to_cutoff) - b) / a / 2 : y_value_to_cutoff / b).toFixed(10) - 1e-10;
                        // -1e-10 makes this negative
                        if (return_0_cutoff < 0) {
                            return_0_cutoff++;
                        }
                    } else {
                        return_0_cutoff = 1;
                    }
                    if (x1 - return_0_cutoff < 5000) {
                        if (x1 - return_0_cutoff < 1) {
                            var output = 0;
                        } else {
                            for (let n = Math.ceil(return_0_cutoff); n < x1; n++) {
                                var output = funct(n, false);
                                if (output >= min_work_time_funct_round + red_line_start_y) {
                                    break;
                                }
                                return_0_cutoff++;
                            }
                        }
                        if (ignore_ends_mwt) {
                            const upper = [return_0_cutoff, output];

                            let did_loop = false;
                            for (let n = Math.floor(return_0_cutoff); n > 0; n--) {
                                const pre_output = funct(n, false);
                                if (pre_output <= red_line_start_y) {
                                    break;
                                }
                                did_loop = true;
                                var output = pre_output;
                                return_0_cutoff--;
                            }
                            if (did_loop) {
                                const lower = [return_0_cutoff, output];
                                return_0_cutoff = [lower, upper][+(min_work_time_funct_round * 2 - upper[1] > lower[1])][0];
                            }
                        }
                    }
                }

                function funct(n, translate = true) {
                    if (translate) {
                        n -= red_line_start_x;
                        if (len_nwd) {
                            n -= Math.floor(n / 7) * len_nwd + mods[n % 7];
                        }
                        if (n > return_y_cutoff) {
                            return y;
                        } else if (n < return_0_cutoff) {
                            return red_line_start_y;
                        }
                    }
                    if (funct_round < min_work_time && (!a && b < min_work_time_funct_round || a && (a > 0) === (n < cutoff_to_use_round))) {
                        var output = min_work_time_funct_round * Math.round(n * (a * n + b) / min_work_time_funct_round);
                        if (a < 0) {
                            output += cutoff_transition_value;
                        } else {
                            output -= cutoff_transition_value;
                        }
                    } else {
                        var output = funct_round * Math.round(n * (a * n + b) / funct_round);
                    }
                    if (remainder_mode && output) {
                        output += y_fremainder;
                    }
                    return output + red_line_start_y;
                }
                function set_mod_days() {
                    mods = [0];
                    let mod_counter = 0;
                    for (let mod_day = 0; mod_day < 6; mod_day++) {
                        if (nwd.includes((assign_day_of_week + red_line_start_x + mod_day) % 7)) {
                            mod_counter++;
                        }
                        mods.push(mod_counter);
                    }
                }
                function set_skew_ratio_lim() {
                    /*
                    skew_ratio = (a + b) * x1 / y1;
                    skew_ratio = funct(1) * x1 / y1;
                    skew_ratio = (y1+min_work_time_funct_round) * x1 / y1;
                    */
                    const y1 = y - red_line_start_y;
                    if (y1) {
                        let x1 = x - red_line_start_x;
                        if (len_nwd) {
                            x1 -= Math.floor(x1 / 7) * len_nwd + mods[x1 % 7];
                        }
                        skew_ratio_lim = (y1+min_work_time_funct_round) * x1 / y1;
                    } else {
                        skew_ratio_lim = 0;
                    }
                }
                // End graph logic

                function draw(x2 = false, y2 = false) {
                    const actually_draw_point = draw_point && x2 !== false;
                    if (actually_draw_point) {
                        // Cant pass in mouse_x and mouse_y as x2 and y2 because mouse_y becomes a bool
                        mouse_x = Math.round((x2-50)/wCon);
                        mouse_y = (y2-50)/hCon;

                        if (mouse_x < Math.min(red_line_start_x,dif_assign)) {
                            mouse_x = Math.min(red_line_start_x,dif_assign);
                        } else if (mouse_x > x) {
                            mouse_x = x;
                        }
                        if (dif_assign <= mouse_x && mouse_x <= len_works + dif_assign) {
                            if (mouse_x < red_line_start_x) {
                                mouse_y = true;
                            } else {
                                mouse_y = Math.abs(mouse_y - funct(mouse_x)) > Math.abs(mouse_y - works[mouse_x - dif_assign]);
                            }
                        } else {
                            mouse_y = false;
                        }
                        if (!set_skew_ratio && last_mouse_x === mouse_x && last_mouse_y === mouse_y) {
                            return;
                        }
                        last_mouse_x = mouse_x;
                        last_mouse_y = mouse_y;
                    }
                    pset(x2, y2);

                    const screen = graph.getContext("2d");
                    screen.scale(scale, scale);
                    screen.clearRect(0, 0, width, height);
                    let radius = wCon / 3;
                    if (radius > 3) {
                        radius = 3;
                    } else if (radius < 2) {
                        radius = 2;
                    }
                    let circle_x,
                        circle_y,
                        line_end = Math.floor(x + Math.ceil(1 / wCon));
                    screen.strokeStyle = "rgb(233,68,46)"; // red
                    screen.lineWidth = radius;
                    screen.beginPath();
                    for (let point = red_line_start_x; point < line_end; point += Math.ceil(1 / wCon)) {
                        circle_x = point * wCon + 50;
                        if (circle_x > width - 5) {
                            circle_x = width - 5;
                        }
                        circle_y = height - funct(point) * hCon - 50;
                        screen.lineTo(circle_x - (point === red_line_start_x) * radius / 2, circle_y); // (point===0)*radius/2 makes sure the first point is filled in properly
                        screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
                        screen.moveTo(circle_x, circle_y);
                    }
                    screen.stroke();
                    screen.beginPath();
                    radius *= 0.75;
                    if (len_works + 1 < line_end) {
                        line_end = len_works + 1;
                    }
                    screen.strokeStyle = "rgb(1,147,255)"; // blue
                    screen.lineWidth = radius;
                    for (let point = 0; point < line_end; point += Math.ceil(1 / wCon)) {
                        circle_x = (point + dif_assign) * wCon + 50;
                        if (circle_x > width - 5) {
                            circle_x = width - 5
                        }
                        circle_y = height - works[point] * hCon - 50;
                        screen.lineTo(circle_x - (point === 0) * radius / 2, circle_y);
                        screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
                        screen.moveTo(circle_x, circle_y);
                    }
                    radius /= 0.75;
                    screen.stroke();
                    screen.textBaseline = "top";
                    screen.textAlign = "start";
                    screen.font = font_size + 'px Open Sans';
                    if (actually_draw_point) {
                        
                        let funct_mouse_x;
                        if (mouse_y) {
                            funct_mouse_x = works[mouse_x - dif_assign];
                        } else {
                            funct_mouse_x = funct(mouse_x).toFixed(6).replace(/\.?0*$/,'');
                        }
                        let str_mouse_x = new Date(ad);
                        str_mouse_x.setDate(str_mouse_x.getDate() + mouse_x);
                        if (disyear) {
                            str_mouse_x = `${('0' + (str_mouse_x.getMonth() + 1)).slice(-2)}/${('0' + str_mouse_x.getDate()).slice(-2)}/${str_mouse_x.getFullYear()}`;
                        } else {
                            str_mouse_x = `${('0' + (str_mouse_x.getMonth() + 1)).slice(-2)}/${('0' + str_mouse_x.getDate()).slice(-2)}`;
                        }
                        if (mouse_x > left_adjust_cutoff) {
                            screen.textAlign = "end";
                        }
                        if (funct_mouse_x < up_adjust_cutoff) {
                            screen.textBaseline = "bottom";
                        }
                        screen.fillText(` (Day: ${str_mouse_x}, ${pluralize(unit,1)}: ${funct_mouse_x}) `, wCon*mouse_x+50, height-funct_mouse_x*hCon-50);
                        screen.fillStyle = "lime";
                        screen.strokeStyle = "lime";
                        screen.beginPath();
                        screen.arc(wCon*mouse_x+50, height-funct_mouse_x*hCon-50, radius, 0, 2 * Math.PI);
                        screen.stroke();
                        screen.fill();
                        screen.fillStyle = "black";
                    }
                    screen.scale(1 / scale, 1 / scale);
                }

                let width,
                    height,
                    wCon,
                    hCon,
                    left_adjust_cutoff,
                    up_adjust_cutoff;
                function drawfixed(reversescale) {
                    // init
                    ({width, height} = fixed_graph.getBoundingClientRect());
                    if (reversescale) {
                        width /= 1.005;
                        height /= 1.05;
                    }
                    
                    // These only really need to be executed once since this function is run for every assignment but doesnt matter
                    if (width > 748) {
                        font_size = 17.1875;
                    } else {
                        font_size = Math.round((width+450)/47*0.6875);
                    }
                    scale = window.devicePixelRatio;

                    graph.width = width * scale;
                    graph.height = height * scale;
                    fixed_graph.width = width * scale;
                    fixed_graph.height = height * scale;
                    wCon = (width - 55) / x;
                    hCon = (height - 55) / y;

                    let screen = fixed_graph.getContext("2d");
                    screen.scale(scale, scale);
                    const point_text = `(Day: 00/00/0000, ${pluralize(unit,1)}: ${"0".repeat(Math.abs(Math.floor(Math.log10(y)))+1 + Math.abs(Math.floor(Math.log10(funct_round))))})`;
                    screen.font = font_size + 'px Open Sans';
                    const point_text_width = screen.measureText(point_text).width,
                        point_text_height = screen.measureText("0").width * 2;
                    left_adjust_cutoff = (width - 50 - point_text_width)/wCon;
                    up_adjust_cutoff = point_text_height/hCon;

                    // bg gradient
                    let gradient = screen.createLinearGradient(0, 0, 0, height * 4 / 3);
                    gradient.addColorStop(0, "white");
                    gradient.addColorStop(1, "lightgray");
                    screen.fillStyle = gradient;
                    screen.fillRect(0, 0, width, height * 4 / 3);

                    
                    // x and y axis rectangles
                    screen.fillStyle = "rgb(185,185,185)";
                    screen.fillRect(40, 0, 10, height);
                    screen.fillRect(0, height - 50, width, 10);

                    // x axis label
                    screen.fillStyle = "black";
                    screen.textAlign = "center";
                    screen.font = '17.1875px Open Sans';
                    screen.fillText("Days", (width - 50) / 2 + 50, height - 5);

                    // y axis label
                    screen.rotate(Math.PI / 2);
                    if (unit === "Minute") {
                        var text = 'Minutes of Work',
                            label_x_pos = -2;
                    } else {
                        var text = `${pluralize(unit)} (${format_minutes(ctime)} per ${pluralize(unit,1)})`,
                            label_x_pos = -5;
                    }
                    if (screen.measureText(text).width > height - 50) {
                        text = pluralize(unit);
                    }
                    screen.fillText(text, (height - 50) / 2, label_x_pos);
                    screen.rotate(-Math.PI / 2);

                    screen.font = '13.75px Open Sans';
                    screen.textBaseline = "top";
                    const x_axis_scale = Math.pow(10, Math.floor(Math.log10(x))) * Math.ceil(x.toString()[0] / Math.ceil((width - 100) / 100));
                    if (x >= 10) {
                        gradient = screen.createLinearGradient(0, 0, 0, height * 4 / 3);
                        gradient.addColorStop(0, "gainsboro");
                        gradient.addColorStop(1, "silver");
                        const small_x_axis_scale = x_axis_scale / 5,
                            label_index = screen.measureText(Math.floor(x)).width * 1.25 < small_x_axis_scale * wCon;
                        for (let smaller_index = 1; smaller_index <= Math.floor(x / small_x_axis_scale); smaller_index++) {
                            if (smaller_index % 5) {
                                const displayed_number = smaller_index * small_x_axis_scale;
                                screen.fillStyle = gradient; // Line color
                                screen.fillRect(displayed_number * wCon + 48.5, 0, 2, height - 50); // Draws line index
                                screen.fillStyle = "rgb(80,80,80)"; // Number color
                                if (label_index) {
                                    const numberwidth = screen.measureText(displayed_number).width;
                                    let number_x_pos = displayed_number * wCon + 50;
                                    if (number_x_pos + numberwidth / 2 > width - 1) {
                                        number_x_pos = width - numberwidth / 2 - 1;
                                    }
                                    screen.fillText(displayed_number, number_x_pos, height - 39);
                                }
                            }
                        }
                    }

                    screen.textBaseline = "alphabetic";
                    screen.textAlign = "right";
                    const y_axis_scale = Math.pow(10, Math.floor(Math.log10(y))) * Math.ceil(y.toString()[0] / Math.ceil((height - 100) / 100));
                    let font_size5 = 16.90625 - Math.ceil(y - y % y_axis_scale).toString().length * 1.71875;
                    if (y >= 10) {
                        const small_y_axis_scale = y_axis_scale / 5;
                        if (font_size5 < 8.5) {
                            font_size5 = 8.5;
                        } 
                        screen.font = font_size5 + 'px Open Sans';
                        const text_height = screen.measureText(0).width * 2,
                            label_index = text_height < small_y_axis_scale * hCon;
                        for (let smaller_index = 1; smaller_index <= Math.floor(y / small_y_axis_scale); smaller_index++) {
                            const displayed_number = smaller_index * small_y_axis_scale;
                            if (smaller_index % 5) {
                                const gradient_percent = 1-(displayed_number * hCon)/(height-50);
                                screen.fillStyle = `rgb(${220-16*gradient_percent},${220-16*gradient_percent},${220-16*gradient_percent})`;
                                screen.fillRect(50, height - 51.5 - displayed_number * hCon, width - 50, 2);
                                screen.fillStyle = "rgb(80,80,80)";
                                if (label_index) {
                                    let number_y_pos = height - displayed_number * hCon - 54 + text_height / 2;
                                    if (number_y_pos < 4 + text_height / 2) {
                                        number_y_pos = 4 + text_height / 2;
                                    }
                                    if (38.5 - screen.measureText(displayed_number).width < 13 - label_x_pos) {
                                        screen.textAlign = "left";
                                        screen.fillText(displayed_number, 13 - label_x_pos, number_y_pos);
                                        screen.textAlign = "right";
                                    } else {
                                        screen.fillText(displayed_number, 38.5, number_y_pos);
                                    }
                                }
                            }
                        }
                    }

                    font_size5 *= 1.2;
                    screen.font = font_size5 + 'px Open Sans';
                    const text_height = screen.measureText(0).width * 2;
                    for (let bigger_index = Math.ceil(y - y % y_axis_scale); bigger_index > 0; bigger_index -= y_axis_scale) {
                        if (bigger_index * 2 < y_axis_scale) {
                            break;
                        }
                        screen.fillStyle = "rgb(205,205,205)";
                        screen.fillRect(50, height - bigger_index * hCon - 52.5, width - 50, 5);
                        screen.fillStyle = "black";
                        let number_y_pos = height - bigger_index * hCon - 54 + text_height / 2;
                        if (number_y_pos < 4 + text_height / 2) {
                            number_y_pos = 4 + text_height / 2;
                        }
                        if (38.5 - screen.measureText(bigger_index).width < 13 - label_x_pos) {
                            screen.textAlign = "left";
                            screen.fillText(bigger_index, 13 - label_x_pos, number_y_pos);
                            screen.textAlign = "right";
                        } else {
                            screen.fillText(bigger_index, 38.5, number_y_pos);
                        }
                    }

                    screen.textBaseline = "top";
                    screen.textAlign = "center";
                    screen.font = '16.5px Open Sans';
                    for (let bigger_index = Math.ceil(x - x % x_axis_scale); bigger_index > 0; bigger_index -= x_axis_scale) {
                        screen.fillStyle = "rgb(205,205,205)";
                        screen.fillRect(bigger_index * wCon + 47.5, 0, 5, height - 50);
                        screen.fillStyle = "black";
                        const numberwidth = screen.measureText(bigger_index).width;
                        let number_x_pos = bigger_index * wCon + 50;
                        if (number_x_pos + numberwidth / 2 > width - 1) {
                            number_x_pos = width - numberwidth / 2 - 1;
                        }
                        screen.fillText(bigger_index, number_x_pos, height - 39);
                    }
                }

                function resize(reversescale) {
                    if (assignment.hasClass("disable-hover") && assignment.is(":visible")) {
                        drawfixed(reversescale);
                        draw();
                    }
                }
                // Draw graph
                resize(true);
                // calling getBoundingClientRect() returns the scale(1.05) height and width
                assignment.on("transitionend", function(e) {

                    // Resize again when width transition ends
                    var e = e || window.event;
                    if (e.originalEvent.propertyName === "width") {
                        resize(false);
                        assignment.off("transitionend");
                    }
                });
                // End draw graph

                const swap_ms = 2000;
                function swap(a1, a2) {
                    $(document).queue(function() {
                        const all = $(".assignment-container");
                        const tar1 = all.eq(a1),
                            tar2 = all.eq(a2);
                        const tar1_height = tar1.height() + 10,
                            tar2_height = tar2.height() + 10;

                        // Deal with existing assingment margin
                        // Don't really know how this works but it makes the swap transition more smooth
                        if (tar1_height > tar2_height) {
                            tar2.css("margin-top", "10px");
                        } else {
                            tar1.css("margin-bottom", "10px");
                        }

                        tar1.animate({
                            top: tar2.offset().top + tar2_height - tar1.offset().top - tar1_height,
                            marginBottom: "-=" + (tar1_height - tar2_height),
                        }, {
                            queue: false,
                            duration: swap_ms,
                            easing: "easeInOutQuad",
                        });

                        tar2.animate({
                            bottom: tar2.offset().top - tar1.offset().top,
                            marginTop: "+=" + (tar1_height - tar2_height),
                        }, {
                            queue: false,
                            duration: swap_ms,
                            easing: "easeInOutQuad",
                            complete: function() {
                                const swap_temp = $("<span></span>").insertAfter(tar2);
                                tar1.after(tar2);
                                swap_temp.after(tar1);
                                tar1.removeAttr("style");
                                tar2.removeAttr("style");
                                swap_temp.remove();
                                $(document).dequeue();
                            },
                        });
                    });
                }
                function format_minutes(total_minutes) {
                    const hour = Math.floor(total_minutes / 60),
                        minute = Math.ceil(total_minutes % 60);
                    if (hour === 0) {
                        if (total_minutes && total_minutes < 1) {
                            return "<1m";
                        }
                        return minute + "m";
                    } else if (minute === 0) {
                        return hour + "h";
                    } else {
                        return hour + "h " + minute + "m";
                    }
                }
            }
            assignment.data('not_first_click', true);
        }
    });
});