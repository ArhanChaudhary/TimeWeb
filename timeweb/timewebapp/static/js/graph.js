/* 
This file includes the code for:

Transitioning the opening and closing of assignments
The entire graph logic
All graph buttons and inputs

This only runs on index.html
*/
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
$(function() {
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
    // scale and font_size is the same for every graph
    let scale, // resolution of the graph
        font_size, // font size of the central text in the graph
        width, // Dimensions of each assignment
        height; // Dimensions of each assignment

    function PreventArrowScroll(e) {
        // Prevent arrow keys from scrolling when clicking the up or down arrows in the graph
        var e = e || window.event;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    }
    // cite
    // https://stackoverflow.com/questions/6427204/date-parsing-in-javascript-is-different-between-safari-and-chrome
    // Date parser for safari
    function parseDate(date) {
        const parsed = Date.parse(date);
        if (!isNaN(parsed)) {
            return parsed;
        }
        return Date.parse(date.replace(/-/g, '/').replace(/[a-z]+/gi, ' '));
    }
    ignore_queue = false;
    $(".assignment").click(function(e) {
        var e = e || window.event;
        // Runs the click function if
        // There is no other assignment being animated (ignored with ignore_queue=true)
        // The background of the assignment was clicked
        // The footer wasn't clicked (to prevent accidental closing)
        if ((ignore_queue || $(document).queue().length === 0) && !["IMG", "BUTTON", "CANVAS", "INPUT"].includes(e.target.tagName) && !$(e.target).hasClass("graph-footer")) {
            // Runs if no assignments are swapping and the element clicked was the assignment background
            let assignment = $(this);
            const graph_container = assignment.find(".graph-container"),
                not_first_click = assignment.data('not_first_click');
            if (graph_container.attr("style") && assignment.hasClass("disable-hover")) {
                // Runs when assignment is clicked while open

                // Animate the graph's margin bottom to close the assignment
                graph_container.animate({
                    marginBottom: -graph_container.height()
                }, 750, "easeOutCubic", function() {
                    // Hide graph when transition ends
                    assignment.css("overflow", "");
                    graph_container.removeAttr("style")
                        // Used in form.js to resolve a promise to transition deleting the assignment
                        .trigger("transitionend");
                });
                // Begin arrow animation
                this.querySelector(".fallingarrowanimation").beginElement();
                // Make assignment overflow hidden 
                assignment.removeClass("disable-hover").css("overflow", "hidden");
                // If no graphs are open, allow arrow scroll
                if ($(".disable-hover").length === 0) {
                    $(document).off("keydown", PreventArrowScroll);
                }
            } else {
                // If the assignment was clicked while it was closing, stop the closing animation and open it
                graph_container.stop();
                assignment.css("overflow", "");
                graph_container.css({
                    "display": "",
                    "margin-bottom": ""
                });
                // Prevents auto scroll if a graph is open
                if ($(".disable-hover").length === 0) {
                    $(document).keydown(PreventArrowScroll);
                }
                // Make graph visible
                graph_container.css("display", "block");
                let graph = this.querySelector('.graph'),
                    fixed_graph = this.querySelector('.fixed-graph');
                // Disable hover
                assignment.addClass("disable-hover");
                // Animate arrow
                this.querySelector(".risingarrowanimation").beginElement();

                // Select the assignment data in dat
                // dat[0] is the settings and "$assignments-container :first child" is the assignments-container-header div, these cancel each other out when indexing
                let selected_assignment = dat[$("#assignments-container").children().index(assignment.parents(".assignment-container"))],
                    // Load in data
                    [file_sel, ad, x, unit, y, works, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd, fixed_mode, dynamic_start, remainder_mode] = selected_assignment;
                // Type conversions
                ad = parseDate(ad + " 00:00");
                x = Math.round((parseDate(x + " 00:00") - ad) / 86400000); // Round to account for DST
                ad = new Date(ad);
                y = +y;
                selected_assignment[5] = selected_assignment[5].map(Number);
                works = selected_assignment[5];
                // dif assign is already an int
                skew_ratio = +skew_ratio;
                ctime = +ctime;
                funct_round = +funct_round;
                // Converts min_work_time to int if string or null
                min_work_time /= ctime;
                nwd = nwd.map(Number);
                // dynamic start is already an into
                let mods, // Handles not working days, explained later
                    assign_day_of_week = ad.getDay(), // Used with mods
                    skew_ratio_lim, // Top and bottom caps for skew ratio
                    red_line_start_x = fixed_mode ? 0 : dynamic_start, // X-coordinate of the start of the red line
                    red_line_start_y = fixed_mode ? 0 : works[red_line_start_x - dif_assign], // Y-coordinate of the start of the red line
                    len_works = works.length - 1,
                    y_fremainder = (y - red_line_start_y) % funct_round, // funct_round remainder
                    ignore_ends_mwt = ignore_ends && min_work_time, // ignore_ends only works when min_work_time is also enabled
                    len_nwd = nwd.length,
                    set_skew_ratio = false, // Bool to manually set skew ratio on graph
                    unit_is_minute = pluralize(unit, 1).toLowerCase() === "minute",
                    min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round, // LCM of min_work_time and funct_round
                    a, // "a" part of parabola
                    b, // "b" part of parabola
                    cutoff_transition_value, // Handles minimum_work_time, explained later
                    cutoff_to_use_round, // Handles minimum_work_time, explained later
                    return_y_cutoff, // X-coordinate to start returning y
                    return_0_cutoff, // X-coordinate to start returning 0
                    last_mouse_x,
                    last_mouse_y,
                    wCon,
                    hCon;
                // Due date
                let due_date = new Date(ad.valueOf());
                due_date.setDate(due_date.getDate() + x);
                // Enable draw_point by default, which determines whether to draw the point on the graph
                let draw_point = true;
                // Handles not working days, explained later
                if (len_nwd) {
                    set_mod_days();
                }
                // Sets the upper and lower caps for skew_ratio
                set_skew_ratio_lim();
                if (skew_ratio > skew_ratio_lim - 1) {
                    skew_ratio = skew_ratio_lim - 1;
                } else if (skew_ratio < 1 - skew_ratio_lim) {
                    skew_ratio = 1 - skew_ratio_lim;
                }
                // Whether or not to display the year
                let date_string_options, date_string_options_no_weekday;
                if (ad.getFullYear() === due_date.getFullYear()) {
                    date_string_options = {month: 'long', day: 'numeric', weekday: 'long'};
                    date_string_options_no_weekday = {month: 'long', day: 'numeric'};
                } else {
                    date_string_options = {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'};
                    date_string_options_no_weekday = {year: 'numeric', month: 'long', day: 'numeric'};
                }
                let date_assignment_created = new Date(ad.valueOf());
                date_assignment_created.setDate(date_assignment_created.getDate() + dif_assign);
                // Days between today and date_assignment_created
                let today_minus_dac = Math.round((new Date(new Date().toDateString()) - date_assignment_created) / 86400000),
                    // Days between today and the assignment date
                    today_minus_ad = Math.round((new Date(new Date().toDateString()) - ad) / 86400000),
                    day = len_works,
                    lw = works[len_works];
                pset();
                if (today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) {
                    day--;
                }
                // Sets event handlers only on the assignment's first click
                // It may make more sense to skip this entire part for now and focus on the graph logic
                if (!not_first_click) {
                    // Redraw graph every mousemove when set skew ratio or draw point is enabled
                    function mousemove(e) {
                        var e = e || window.event;
                        const offset = $(fixed_graph).offset();
                        if (set_skew_ratio) {
                            pset(e.pageX - offset.left, e.pageY - offset.top);
                            day = len_works;
                            // Subtract day by one if assignment is in progress
                            if (today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) {
                                day--;
                            }
                        }
                        // Passes in mouse x and y to draw, explained later
                        draw(e.pageX - offset.left, e.pageY - offset.top);
                    }
                    // Turn off mousemove to ensure there is only one mousemove handler at a time
                    $(graph).off("mousemove").mousemove(mousemove);
                    // Graph resize event handler
                    $(window).resize(resize);
                    // Ajax any button
                    let ajaxTimeout,
                        data = {
                            'csrfmiddlewaretoken': csrf_token,
                            'pk': $(graph).attr("value"),
                        };

                    function SendButtonAjax(key, value) {
                        // Add key and value the data going to be sent
                        // This way, if this function is called multiple times for different keys and values, they are all sent in one ajax rather than many smaller ones
                        data[key] = value;
                        clearTimeout(ajaxTimeout);
                        ajaxTimeout = setTimeout(function() {
                            const success = function() {
                                gtag("event","save_assignment");
                            }
                            // Send data along with the assignment's primary key

                            // It is possible for users to send data that won't make any difference, for example they can quickly click fixed_mode twice, yet the ajax will still send
                            // However, I decided to skip this check and still send the ajax
                            // Coding in a check to only send an ajax when the data has changed is tedious, as I have to store the past values of every button to check with the current value
                            // Plus, a pointless ajax of this sort won't happen frequently, and will have a minimal impact on the server's performance
                            $.ajax({
                                type: "POST",
                                data: data,
                                success: success,
                                error: error,
                            });
                            // Reset data
                            data = {
                                'csrfmiddlewaretoken': csrf_token,
                                'pk': $(graph).attr("value"),
                            }
                        }, 1000);
                    }
                    let graphtimeout, // set the hold delay to a variable so it can be cleared key if the user lets go of it within 500ms
                        fired = false, // $(document).keydown( fires for every frame a key is held down. This makes it behaves like it fires once
                        graphinterval,
                        whichkey,
                        old_skew_ratio = skew_ratio; // Old skew ratio is the old original value of the skew ratio if the user decides to cancel
                    function ChangeSkewRatio() {
                        // Change skew ratio by +- 0.1 and cap it
                        if (whichkey === "ArrowDown") {
                            skew_ratio = +(skew_ratio - 0.1).toFixed(1);
                            if (skew_ratio < 1 - skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim - 1;
                            }
                        } else {
                            skew_ratio = +(skew_ratio + 0.1).toFixed(1);
                            if (skew_ratio > skew_ratio_lim - 1) {
                                skew_ratio = 1 - skew_ratio_lim;
                            }
                        }
                        pset();
                        day = len_works;
                        if (today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) {
                            day--;
                        }
                        // Save skew ratio and draw
                        selected_assignment[7] = skew_ratio; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                        old_skew_ratio = skew_ratio;
                        SendButtonAjax('skew_ratio', skew_ratio);
                        draw();
                    }
                    // Up and down arrow event handler
                    $(document).keydown(function(e) {
                        var e = e || window.event;
                        // $(fixed_graph).is(":visible") to make sure it doesnt change when the assignment is closed
                        // !$(document.activeElement).hasClass("skew-ratio-textbox") prevents double dipping
                        if ((e.key === "ArrowUp" || e.key === "ArrowDown") && $(fixed_graph).is(":visible") && !$(document.activeElement).hasClass("skew-ratio-textbox")) {
                            const rect = fixed_graph.getBoundingClientRect();
                            // Makes sure graph is on screen
                            if (rect.bottom - rect.height / 1.5 > 70 && rect.y + rect.height / 1.5 < window.innerHeight && !fired) {
                                // "fired" makes .keydown fire only when a key is pressed, not repeatedly
                                fired = true;
                                // Which key was pressed
                                whichkey = e.key;
                                // Change skew ratio
                                ChangeSkewRatio();
                                // Add delay to change skew ratio internal
                                graphtimeout = setTimeout(function() {
                                    clearInterval(graphinterval);
                                    graphinterval = setInterval(ChangeSkewRatio, 13); // Changes skew ratio
                                }, 500);
                            }
                        }
                    });
                    $(document).keyup(function(e) {
                        var e = e || window.event;
                        if (e.key === whichkey) {
                            // If the keyup was the same key that was just pressed stop change skew ratio
                            fired = false;
                            clearTimeout(graphtimeout);
                            clearInterval(graphinterval);
                        }
                    });

                    //
                    // Nine buttons event listeners
                    //

                    // Enable mousemove and set_skew_ratio when set skew ratio button is clicked
                    assignment.find(".skew-ratio-button").click(function() {
                        $(this).onlyText("(Click again to cancel)").one("click", cancel_sr);
                        // Turn off mousemove to ensure there is only one mousemove handler at a time
                        $(graph).off("mousemove").mousemove(mousemove);
                        set_skew_ratio = true;
                    }).info("right", 
                        `The skew ratio determines the work distribution of the graph

                        Click this button and hover over the graph and click it to save
                        
                        Note: this has no effect on assignments with only one working day`);
                    $(graph).click(function(e) {
                        if (set_skew_ratio) {
                            // Runs if (set_skew_ratio && draw_point || set_skew_ratio && !draw_point)
                            set_skew_ratio = false;
                            // stop set skew ratio if canvas is clicked
                            $(this).next().find(".skew-ratio-button").onlyText("Set skew ratio using graph").off("click", cancel_sr);
                            // Save skew ratio
                            selected_assignment[7] = skew_ratio; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                            old_skew_ratio = skew_ratio;
                            SendButtonAjax('skew_ratio', skew_ratio);
                            // Disable mousemove
                            if (!draw_point) {
                                $(this).off("mousemove");
                            }
                            draw();
                        } else if (draw_point) {
                            if (!isMobile) {
                                // Runs if (!set_skew_ratio && draw_point) and not on mobile
                                // Disable draw point
                                $(this).off("mousemove");
                                draw_point = false;
                                last_mouse_x = -1;
                                draw();
                            }
                        } else {
                            // Runs if (!set_skew_ratio && !draw_point)
                            // Enable draw point
                            draw_point = true;
                            // Turn off mousemove to ensure there is only one mousemove handler at a time
                            $(this).off("mousemove").mousemove(mousemove);
                            // Pass in e because $.trigger makes e.pageX undefined
                            mousemove(e);
                        }
                    });
                    // Cancel set skew ratio
                    function cancel_sr() {
                        $(this).onlyText("Set skew ratio using graph");
                        set_skew_ratio = false;
                        skew_ratio = old_skew_ratio;
                        draw();
                        // No need to ajax since skew ratio is the same
                    }
                    // Dynamically update skew ratio from textbox
                    assignment.find(".skew-ratio-textbox").on("keydown paste click keyup", function() { // keydown for normal sr and keyup for delete
                        var e = e || window.event;
                        if (old_skew_ratio === undefined) {
                            // Sets old_skew_ratio
                            old_skew_ratio = skew_ratio;
                        }
                        if ($(this).val()) {
                            // Sets and caps skew ratio
                            // The skew ratio in the code is 1 more than the displayed skew ratio
                            skew_ratio = +$(this).val() + 1;
                            if (skew_ratio > skew_ratio_lim - 1) {
                                skew_ratio = 1 - skew_ratio_lim;
                            } else if (skew_ratio < 1 - skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim - 1;
                            }
                        } else {
                            // Reset skew ratio to old value if blank
                            skew_ratio = old_skew_ratio;
                            old_skew_ratio = undefined;
                        }
                        draw();
                    }).keypress(function(e) {
                        var e = e || window.event;
                        // Saves skew ratio on enter
                        if (e.key === "Enter") {
                            // focusout event
                            this.blur();
                        }
                    }).focusout(function() {
                        $(this).val('');
                        if (old_skew_ratio !== undefined) {
                            // Save skew ratio
                            selected_assignment[7] = skew_ratio; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                            old_skew_ratio = skew_ratio;
                            SendButtonAjax('skew_ratio', skew_ratio);
                        }
                        // Update old skew ratio
                        old_skew_ratio = skew_ratio;
                    }).info("right", "Enter skew ratio as a number. Leave this blank to cancel or press enter to save",'after').css({
                        left: 134,
                        position: "absolute",
                        bottom: 36,
                        zIndex: "2",
                    });
                    // Remainder mode
                    assignment.find(".remainder-mode-button").click(function() {
                        remainder_mode = !remainder_mode;
                        selected_assignment[14] = remainder_mode; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                        $(this).onlyText(remainder_mode ? "Switch to Remainder: Last" : "Switch to Remainder: First");
                        SendButtonAjax('remainder_mode', remainder_mode);
                        draw();
                    }).html(remainder_mode ? "Switch to Remainder: Last" : "Switch to Remainder: First") // Initially set html for remainder mode
                    .info('left',
                    `Ignore this if you don't see a "Remainder: First" or "Remainder: Last" on your graph
                    
                    If the total number of units of work isn't divisible by the number of them you will complete at a time, this determines whether to complete the remainder of work on the first or last working day of this assignment`,'prepend').css({
                        left: -3,
                        marginRight: 3,
                    });
                    // Fixed/dynamic mode
                    assignment.find(".fixed-mode-button").click(function() {
                        fixed_mode = !fixed_mode;
                        selected_assignment[12] = fixed_mode; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                        $(this).onlyText(fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
                        SendButtonAjax('fixed_mode', fixed_mode);
                        if (fixed_mode) {
                            // Set start of red line and pset()
                            red_line_start_x = 0;
                            red_line_start_y = 0;
                            pset();
                            // Day needs to be set in case it was subtracted by one
                            day = len_works;
                            // Subtract day by one if assignment is in progress
                            if (today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) {
                                day--;
                            }
                        } else {
                            red_line_start_x = dynamic_start;
                            red_line_start_y = works[red_line_start_x - dif_assign];
                            day = len_works;
                            // No need to pset()
                            // Caps dynamic start at x, wouldn't make sense for todo to be shown for the day on the due date
                            if (len_works + dif_assign === x) {
                                day--;
                            }
                        }
                        y_fremainder = (y - red_line_start_y) % funct_round;
                        if (len_nwd) {
                            set_mod_days();
                        }
                        draw();
                    }).html(fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode").info("top",
                    `Fixed mode:
                    In this mode, the graph is static and does not change. If you fail to complete the specified amount of work for any day, the assignment is marked as "in progress," and you will have to make up the remainder of its work later that day. If you still don't finish its work, you will have to make it up on the next day.

                    This mode is recommended for discipline or if the assignment is important


                    Dynamic mode (default):
                    In this mode, if you fail to complete the specified amount of work for any day, the graph will change itself to start at your last work input, adapting to your work schedule

                    Use this if you can't keep up with an assignment's work schedule. It's easy to fall behind with dynamic mode, so be careful`,"prepend").css({
                        left: -3,
                        marginRight: 3,
                    }).children().first().css({
                        "font-size": 11,
                        "line-height": "11px",
                    });
                    const total_work_input_button = assignment.find(".total-work-input-button");
                    assignment.find(".submit-work-button").click(function() {
                        if (lw >= y) {
                            alert("You have already finished this assignment");
                        } else if (today_minus_dac > -1) {
                            if (nwd.includes((assign_day_of_week + dif_assign + day) % 7)) {
                                var todo = 0;
                            } else {
                                var todo = funct(day + dif_assign + 1) - lw;
                            }
                            const rem_work = today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay());
                            let input_done = total_work_input_button.val().trim().toLowerCase();
                            switch (input_done) {
                                case "fin":
                                    input_done = funct(day + dif_assign + 1);
                                    break;
                                default: {
                                    input_done = +input_done;
                                    if (isNaN(input_done)) {
                                        return alert("Value isn't a number or keyword");
                                    }
                                }
                            }
                            if (len_works + dif_assign === x - 1 && x - 1 !== today_minus_ad && input_done < y && !rem_work) {
                                return alert("Your last work input must complete the assignment");
                            }
                            if (input_done < 0) {
                                input_done = 0;
                            }
                            if (rem_work) {
                                works[len_works] = input_done;
                                len_works -= 1;
                            } else {
                                works.push(input_done);
                            }
                            lw = input_done;
                            len_works++;
                            if (input_done !== todo) {
                                if (len_works + dif_assign === x) {
                                    dynamic_start = len_works + dif_assign - 1;
                                } else {
                                    dynamic_start = len_works + dif_assign;
                                }
                                selected_assignment[13] = dynamic_start;
                                SendButtonAjax("dynamic_start", dynamic_start);
                                if (!fixed_mode) {
                                    red_line_start_x = dynamic_start;
                                    red_line_start_y = works[dynamic_start - dif_assign];
                                    y_fremainder = (y - red_line_start_y) % funct_round;
                                    if (len_nwd) {
                                        set_mod_days();
                                    }
                                    set_skew_ratio_lim();
                                    pset();
                                }
                            }
                            SendButtonAjax("works", works);
                            day = len_works;
                            if (today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) {
                                day--;
                            }
                            draw();
                            if (lw >= y) {
                                alert("Finish!\nYou have completed this assignment, good job!");
                            }
                        } else {
                            alert("Please wait until this is assigned");
                        }
                    });
                    total_work_input_button.info("top",
                        `Enter the total number of units done on the graph's displayed date and submit
                        
                        Keyword: enter "fin" if you have completed an assignment's work for its displayed date`,"after").css({
                        left: "calc(50% + 63px)",
                        top: 3,
                        position: "absolute",
                    });
                    assignment.find(".delete-work-input-button").click(function() {
                        if (len_works > 0) {
                            // Change day if assignment isn't in progress
                            if (!(today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay()))) {
                                day--;
                            }
                            works.pop();
                            len_works--;
                            lw = works[len_works];

                            // If the deleted work input cut the dynamic start, run this
                            // Reverses the logic of work inputs in and recursively decreases red_line_start_x
                            if (red_line_start_x > len_works + dif_assign) {
                                // The outer for loop decrements red_line_start_x if the inner for loop didn't break
                                outer: for (red_line_start_x = red_line_start_x - 2; red_line_start_x > dif_assign - 1; red_line_start_x--) {
                                    red_line_start_y = works[red_line_start_x - dif_assign];
                                    y_fremainder = (y - red_line_start_y) % funct_round;
                                    if (len_nwd) {
                                        set_mod_days();
                                    }
                                    set_skew_ratio_lim();
                                    pset();
                                    // The inner for loop checks if every work input is the same as the red line for all work inputs greater than that red_line_start_x
                                    let next_funct = funct(red_line_start_x),
                                        next_work = works[red_line_start_x - dif_assign];
                                    for (let i = red_line_start_x; i < len_works + dif_assign; i++) {
                                        const this_funct = next_funct,
                                            this_work = next_work;
                                        next_funct = funct(i + 1),
                                        next_work = works[i - dif_assign + 1];
                                        // When a day is found where the work input isn't the same as the red line for that red_line_start_x, increase red_line_start_x back to where this doesnt happen and break
                                        if (next_funct - this_funct !== next_work - this_work) {
                                            red_line_start_x++;
                                            break outer;
                                        }
                                    }
                                }
                                if (red_line_start_x < 0) {
                                    red_line_start_x = 0;
                                }
                                red_line_start_y = works[red_line_start_x - dif_assign];
                                y_fremainder = (y - red_line_start_y) % funct_round;
                                if (len_nwd) {
                                    set_mod_days();
                                }
                                set_skew_ratio_lim();
                                dynamic_start = red_line_start_x;
                                selected_assignment[13] = dynamic_start;
                                SendButtonAjax("dynamic_start", dynamic_start);
                            }
                            SendButtonAjax("works", works);
                            draw();
                        }
                    });
                    assignment.find(".display-button").click(function() {
                        alert("This feature has not yet been implented");
                    }).css("text-decoration", "line-through");
                    assignment.find(".hide-assignment-button").click(function() {
                        alert("This feature has not yet been implented");
                    }).css("text-decoration", "line-through");
                    function info_button_handler(_, run=true) {
                        if (run) {
                            if ($(this).data("is_showing")) {
                                $(this).data("is_showing", false).trigger('blur', false);
                            } else {
                                $(this).data("is_showing", true);
                            }
                        }
                        return false;
                    }
                    assignment.find(".info-button").on('click blur', info_button_handler);
                }

                //
                // Graph logic
                //

                /* 
                The red line for all of the assignments follow a parabola
                The first part of the pset() function calculates the a and b values, and the second part handles the minimum work time and return cutoffs
                funct(n) returns the output of an^2 + bn (with no c variable because it is translated to go through the origin)
                set_mod_days() helps integrate not working days into the schedule 
                */
                function pset(x2 = false, y2 = false) {
                    /*
                    The purpose of this function is to calculate these seven variables:
                    a
                    b
                    skew_ratio
                    cutoff_transition_value
                    cutoff_to_use_round
                    return_y_cutoff
                    return_0_cutoff


                    This part calculates a, b, and skew_ratio

                    Three points are defined, one of which is (0,0), to generate a and b variables such that the parabola passes through all three of them
                    This works because there is a parabola that exists that passes through any three chosen points (with different x coordinates)
                    Notice how the parabola passes through the origin, meaning it does not use a c variable
                    If the start of the line is moved and doesn't pass through (0,0) anymore, translate the parabola back to the origin instead of using a c variable
                    Once the a and b variables are calculated, the assignment is retranslated accordingly

                    The second point is (x1,y1), where x1 is the amount of days and y1 is the amount of units

                    If set skew ratio is enabled, the third point is (x2,y2). skew_ratio will also be redefined
                    If set skew ratio isn't enabled, the third point is now (1,x1/y1 * skew_ratio)
                    Here, a straight line is connected from (0,0) and (x1,y1) and then the output of f(1) of that straight line is multiplied by the skew ratio to get the y-coordinate of the first point
                    */

                    // Define (x1, y1) and translate both variables to (0,0)
                    let x1 = x - red_line_start_x,
                        y1 = y - red_line_start_y;
                    if (len_nwd) {
                        x1 -= Math.floor(x1 / 7) * len_nwd + mods[x1 % 7]; // Handles not working day, explained later
                    }
                    // If set skew ratio is enabled, make the third point (x2,y2), which was passed as a parameter
                    // x2 !== false is necessary because the user can resize the window for example and call this function while set skew ratio is true but without passing any coordinates
                    if (set_skew_ratio && x2 !== false) {
                        // (x2,y2) are the raw coordinates of the graoh
                        // This converts the raw coordinates to the graph coordinates that match the steps on the x and y axes
                        // -53.7 and -44.5 were used instead of -50 because I experimented those to be the optimal positions of the graph coordinates
                        x2 = (x2 - 53.7) / wCon - red_line_start_x;
                        y2 = (height - y2 - 44.5) / hCon - red_line_start_y;
                        // Handles not working days, explained later
                        if (len_nwd) {
                            const floorx2 = Math.floor(x2);
                            if (nwd.includes((assign_day_of_week + floorx2 + red_line_start_x) % 7)) {
                                x2 = floorx2;
                            }
                            x2 -= Math.floor(x2 / 7) * len_nwd + mods[floorx2 % 7];
                        }
                        // Use !(x2 > 0) instead of (x2 <= 0) because x2 can be NaN from being outside of the graph, caused by negative indexing by floorx2. This ensures that NaN passes the below if statement
                        if (!(x2 > 0)) {
                            // If the mouse is outside the graph to the left, make a line with the slope of y1
                            skew_ratio = skew_ratio_lim - 1;
                            a = 0;
                            b = y1;
                            return_y_cutoff = x1 ? 0 : -1;
                            return_0_cutoff = 1;
                            cutoff_transition_value = 0;
                            return;
                        } else if (x2 >= x1) {
                            // If the mouse is outside the graph to the right, connect the points (0,0), (x1-1,0), (x1,y1)
                            // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                            a = y1 / x1;
                            b = a * (1 - x1);

                            skew_ratio = 1 - skew_ratio_lim;
                        } else {
                            // Adjusts for remainder mode
                            if (remainder_mode) {
                                y2 -= y_fremainder;
                            }
                            // If the parabola is being set by the graph, connect (0,0), (x1,y1), (x2,y2)
                            // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                            a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
                            b = (y1 - x1 * x1 * a) / x1;

                            // Redefine skew ratio
                            skew_ratio = (a + b) * x1 / y1;
                            // Cap skew ratio
                            if (skew_ratio > skew_ratio_lim - 1) {
                                skew_ratio = skew_ratio_lim - 1;
                            } else if (skew_ratio < 1 - skew_ratio_lim) {
                                skew_ratio = 1 - skew_ratio_lim;
                            } else if (-0.05 < skew_ratio % 1 && skew_ratio % 1 < 0.05) {
                                // Snap skew ratio to whole numbers
                                skew_ratio = Math.round(skew_ratio);
                                // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                                a = y1 * (1 - skew_ratio) / ((x1 - 1) * x1);
                                b = (y1 - x1 * x1 * a) / x1;
                            }
                        }
                    } else {
                        // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                        a = y1 * (1 - skew_ratio) / ((x1 - 1) * x1);
                        b = (y1 - x1 * x1 * a) / x1;
                    }
                    if (!Number.isFinite(a)) {
                        // If there was a zero division somewhere, where x2 === 1 or something else happened, make a line with the slope of y1
                        a = 0;
                        b = y1;
                        return_y_cutoff = x1 ? 0 : -1;
                        return_0_cutoff = 1;
                        cutoff_transition_value = 0;
                        return;
                    }
                    if (a <= 0 || b > 0) {
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
                                    cutoff_transition_value = min_work_time_funct_round - output + prev_output;
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
                    if (return_y_cutoff < 2500) {
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
                            const lower = [return_y_cutoff, y - output];

                            let did_loop = false;
                            for (let n = Math.ceil(return_y_cutoff); n < x1; n++) {
                                const pre_output = funct(n, false);
                                if (pre_output >= y) {
                                    break;
                                }
                                did_loop = true;
                                output = pre_output;
                                return_y_cutoff++;
                            }
                            if (did_loop) {
                                const upper = [return_y_cutoff, y - output];
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
                    if (x1 - return_0_cutoff < 2500) {
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
                        // Translate x coordinate 
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
                        // Get translated y coordinate
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
                    // Return untranslated y coordinate
                    // No point in untranslating x coordinate
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
                        skew_ratio_lim = (y1 + min_work_time_funct_round) * x1 / y1;
                    } else {
                        skew_ratio_lim = 0;
                    }
                    assignment.find(".skew-ratio-textbox").attr({
                        min: 1 - skew_ratio_lim,
                        max: skew_ratio_lim - 1,
                    });
                }
                //
                // End graph logic
                //

                //
                // Draw graph
                //
                function draw(x2 = false, y2 = false) {
                    const actually_draw_point = draw_point && x2 !== false;
                    if (actually_draw_point) {
                        // Cant pass in mouse_x and mouse_y as x2 and y2 because mouse_y becomes a bool
                        // -53.7 and -44.5 were used instead of -50 because I experimented those to be the optimal positions of the graph coordinates
                        var mouse_x = Math.round((x2 - 53.7) / wCon),
                            mouse_y = (height - y2 - 44.5) / hCon;
                        if (mouse_x < Math.min(red_line_start_x, dif_assign)) {
                            mouse_x = Math.min(red_line_start_x, dif_assign);
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
                        last_mouse_x = mouse_x; last_mouse_y = mouse_y;
                    }
                    pset(x2, y2);

                    const screen = graph.getContext("2d");
                    screen.scale(scale, scale);
                    screen.clearRect(0, 0, width, height);
                    let move_info_down,
                        todo = funct(day+dif_assign+1);
                    if (show_progress_bar) {
                        move_info_down = 0;
                        let should_be_done_x = width - 155 + todo / y * 146,
                            bar_move_left = should_be_done_x - width + 17;
                        if (bar_move_left < 0 || x <= today_minus_ad || lw >= y) {
                            bar_move_left = 0
                        } else if (should_be_done_x > width - 8) {
                            bar_move_left = width - 8;
                        }
                        // bar move left
                        screen.fillStyle = "rgb(55,55,55)";
                        screen.fillRect(width-155-bar_move_left,height-121,148,50);
                        screen.fillStyle = "lime";
                        screen.fillRect(width-153-bar_move_left,height-119,144,46);

                        screen.fillStyle = "rgb(0,128,0)";
                        const slash_x = width - 142 - bar_move_left;
                        screen.beginPath();
                        screen.moveTo(slash_x,height-119);
                        screen.lineTo(slash_x+15,height-119);
                        screen.lineTo(slash_x+52.5,height-73);
                        screen.lineTo(slash_x+37.5,height-73);
                        screen.fill();
                        screen.beginPath();
                        screen.moveTo(slash_x+35,height-119);
                        screen.lineTo(slash_x+50,height-119);
                        screen.lineTo(slash_x+87.5,height-73);
                        screen.lineTo(slash_x+72.5,height-73);
                        screen.fill();
                        screen.beginPath();
                        screen.moveTo(slash_x+70,height-119);
                        screen.lineTo(slash_x+85,height-119);
                        screen.lineTo(slash_x+122.5,height-73);
                        screen.lineTo(slash_x+107.5,height-73);
                        screen.fill();

                        screen.textAlign = "center";
                        screen.fillStyle = "black";
                        screen.font = '13.75px Open Sans';
                        screen.textBaseline = "top";
                        if (x > today_minus_ad && lw < y) {
                            screen.fillText(`Your Progress: ${Math.floor(lw/y*100)}%`, width-81, height-68);
                            const done_x = width-153+lw/y*144-bar_move_left;
                            screen.fillStyle = "white";
                            screen.fillRect(done_x, height-119, width-9-bar_move_left-done_x, 46);
                            if (should_be_done_x >= width - 153) {
                                screen.fillStyle = "black";
                                if (should_be_done_x > width - 17) {
                                    should_be_done_x = width - 17;
                                }
                                screen.rotate(Math.PI / 2);
                                // Since rotate, swap x and y, make x negative
                                screen.fillText("Goal", height-95, -should_be_done_x-14);
                                screen.rotate(-Math.PI / 2);
                                screen.fillStyle = "rgb(55,55,55)";
                                screen.fillRect(should_be_done_x, height-119, 2, 46);
                            }
                        } else {
                            screen.fillText("Completed!", width-81-bar_move_left, height-68);
                        }
                    } else {
                        move_info_down = 72;
                    }
                    let radius = wCon / 3;
                    if (radius > 3) {
                        radius = 3;
                    } else if (radius < 2) {
                        radius = 2;
                    }
                    let circle_x,
                        circle_y,
                        line_end = x + Math.ceil(1 / wCon);
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
                    if (len_works + Math.ceil(1 / wCon) < line_end) {
                        line_end = len_works + Math.ceil(1 / wCon);
                    }
                    screen.strokeStyle = "rgb(1,147,255)"; // blue
                    screen.lineWidth = radius;
                    for (let point = 0; point < line_end; point += Math.ceil(1 / wCon)) {
                        circle_x = (point + dif_assign) * wCon + 50;
                        if (point > len_works) {
                            circle_y = height - works[len_works] * hCon - 50;
                        } else {
                            circle_y = height - works[point] * hCon - 50;
                        }
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
                            funct_mouse_x = funct(mouse_x).toFixed(6).replace(/\.?0*$/, '');
                        }
                        let str_mouse_x = new Date(ad);
                        str_mouse_x.setDate(str_mouse_x.getDate() + mouse_x);
                        str_mouse_x = str_mouse_x.toLocaleDateString("en-US", date_string_options_no_weekday);
                        if (wCon * mouse_x + 50 + screen.measureText(`(Day: ${str_mouse_x}, ${pluralize(unit,1)}: ${funct_mouse_x})`).width > width - 5) {
                            screen.textAlign = "end";
                        }
                        if (height - funct_mouse_x * hCon - 50 + screen.measureText(0).width*2> height - 50) {
                            screen.textBaseline = "bottom";
                        }
                        screen.fillStyle = "black";
                        screen.fillText(` (Day: ${str_mouse_x}, ${pluralize(unit,1)}: ${funct_mouse_x}) `, wCon * mouse_x + 50, height - funct_mouse_x * hCon - 50);
                        screen.fillStyle = "lime";
                        screen.strokeStyle = "lime";
                        screen.beginPath();
                        screen.arc(wCon * mouse_x + 50, height - funct_mouse_x * hCon - 50, radius, 0, 2 * Math.PI);
                        screen.stroke();
                        screen.fill();
                        screen.fillStyle = "black";
                    }
                    const rounded_skew_ratio = Math.round(1000*(skew_ratio-1))/1000;
                    screen.textAlign = "end";
                    screen.fillStyle = "black";
                    screen.textBaseline = "top";
                    screen.font = '13.75px Open Sans';
                    if (((y - red_line_start_y) / funct_round) % 1) {
                        screen.fillText(remainder_mode ? "Remainder: First" : "Remainder: Last", width-2, height-155+move_info_down);
                        screen.fillText(fixed_mode ? "Fixed Mode" : "Dynamic Mode", width-2, height-172+move_info_down);
                    } else {
                        screen.fillText(fixed_mode ? "Fixed Mode" : "Dynamic Mode", width-2, height-155+move_info_down);
                    }
                    screen.fillText(`Skew Ratio: ${rounded_skew_ratio} (${rounded_skew_ratio ? "Parabolic" : "Linear"})`, width-2, height-138+move_info_down);

                    const daysleft = x - today_minus_ad;
                    let strdaysleft = '';
                    if (daysleft < -1) {
                        strdaysleft = ` (${-daysleft} Days Ago)`;
                    } else {
                        switch (daysleft) {
                            case -1:
                                strdaysleft = " (Yesterday)";
                                break
                            case 0:
                                strdaysleft = " (Today)";
                                break;
                            case 1:
                                strdaysleft = " (TOMORROW!!!)";
                                break;
                        }
                    }
                    screen.textAlign = "center";
                    screen.textBaseline = "bottom";
                    screen.font = font_size + 'px Open Sans';
                    const row_height = screen.measureText(0).width * 2;
                    screen.fillText(`Due Date: ${due_date.toLocaleDateString("en-US", date_string_options)}${strdaysleft}`, 50+(width-50)/2, row_height);
                    if (lw < y && daysleft > 0) {
                        todo -= lw;
                        let reach_deadline = "";
                        if (todo <= 0 || nwd.includes((assign_day_of_week+dif_assign+day) % 7)) {
                            todo = 0;
                            reach_deadline = " (Deadline Reached)";
                        } else if (!unit_is_minute) {
                            screen.fillText(`Estimated Completion Time: ${format_minutes(todo*ctime)}`, 50+(width-50)/2, row_height*6);
                        } else if (todo*ctime >= 60) {
                            reach_deadline = ` (${format_minutes(todo*ctime)})`;
                        }
                        let displayed_day = new Date(date_assignment_created.valueOf());
                        displayed_day.setDate(displayed_day.getDate() + day);
                        distance_today_from_displayed_day = today_minus_dac - day;

                        let str_day = displayed_day.toLocaleDateString("en-US", date_string_options);
                        switch (distance_today_from_displayed_day) {
                            case -1:
                                str_day += ' (Tomorrow)';
                                break;
                            case 0:
                                str_day += ' (Today)';
                                break;
                            case 1:
                                str_day += ' (Yesterday)';
                                break;
                        }
                        str_day += ':';
                        screen.fillText(str_day, 50+(width-50)/2, row_height*3);
                        let todo_message;
                        if (displayed_day.toDateString() !== new Date().toDateString()) {
                            todo_message = `${pluralize(unit)} to Complete for this Day: ${todo}${reach_deadline}`;
                        } else if (today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) {
                            todo_message = `Remaining ${pluralize(unit)} to Complete for Today: ${todo}${reach_deadline}`;
                        } else {
                            todo_message = `${pluralize(unit)} to Complete for Today: ${todo}${reach_deadline}`;
                        }
                        screen.fillText(todo_message, 50+(width-50)/2, row_height*4);
                        screen.fillText(`${pluralize(unit)} already Completed: ${lw}/${y}`, 50+(width-50)/2, row_height*5);
                        if (today_minus_ad < 0) {
                            screen.fillText("This Assignment has Not Yet been Assigned!", 50+(width-50)/2, row_height*8);
                        } else if (distance_today_from_displayed_day > 0) {
                            screen.fillText("You have not Entered in your Work from Previous Days!", 50+(width-50)/2, row_height*8);
                            screen.fillText("Please Enter in your Progress to Continue", 50+(width-50)/2, row_height*9);
                        } else if (nwd.includes((assign_day_of_week+dif_assign+day) % 7) || new Date(displayed_day.toDateString()) > new Date(new Date().toDateString())) {
                            screen.fillText("You have Completed your Work for Today!", 50+(width-50)/2, row_height*12);
                        } else if (len_works && !(today_minus_dac === len_works - 1 && funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay())) && (lw - works[len_works-1]) / warning_acceptance * 100 < funct(len_works + dif_assign) - works[len_works-1]) {
                            screen.fillText("!!! ALERT !!!", 50+(width-50)/2, row_height*8);
                            screen.fillText("You are BEHIND Schedule!", 50+(width-50)/2, row_height*9);
                        }
                    } else {
                        screen.fillText('Amazing Effort! You have Finished this Assignment!', 50+(width-50)/2, row_height*7);
                    }
                    screen.scale(1 / scale, 1 / scale);
                }

                function drawfixed() {
                    // These only really need to be executed once since this function is run for every assignment but doesnt matter
                    width = $(fixed_graph).width();
                    height = $(fixed_graph).height();
                    if (width > 500) {
                        font_size = 13.9;
                    } else {
                        font_size = Math.round((width + 450) / 47 * 0.6875);
                    }
                    scale = window.devicePixelRatio;
                    wCon = (width - 55) / x;
                    hCon = (height - 55) / y;

                    graph.width = width * scale;
                    graph.height = height * scale;
                    fixed_graph.width = width * scale;
                    fixed_graph.height = height * scale;
                    let screen = fixed_graph.getContext("2d");
                    screen.scale(scale, scale);

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
                    if (unit_is_minute) {
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
                                const gradient_percent = 1 - (displayed_number * hCon) / (height - 50);
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
                    screen.fillText(0, 39, height - 52);

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
                    screen.fillText(0, 55.5, height - 38.5);
                    if (today_minus_ad > -1) {
                        const today_x = today_minus_ad*wCon+47.5;
                        screen.fillStyle = "rgb(150,150,150)";
                        screen.fillRect(today_x, 0, 5, height-50);
                        screen.fillStyle = "black";
                        screen.rotate(Math.PI / 2);
                        screen.textAlign = "center";
                        screen.textBaseline = "middle";
                        screen.font = '17.1875px Open Sans';
                        screen.fillText("Today Line", (height-50)/2, -today_x-2.5)
                        screen.rotate(-Math.PI / 2);
                    }
                }

                function resize() {
                    if (assignment.hasClass("disable-hover") && assignment.is(":visible")) {
                        drawfixed();
                        draw();
                    }
                }
                resize();
                //
                // End draw graph
                //
                assignment.next().remove();
                setTimeout(function() {
                    if ("first_login" in sessionStorage) {
                        alert("Welcome to the graph, a visualization of how your assignment's work schedule will look like");
                        alert(`The graph splits up your assignment in days over units of work, with day zero being its assignment date and the last day being its due date`);
                        alert("The red line is the generated work schedule of this assignment, and it can be adjusted by changing its skew ratio");
                        alert("As you progress through your assignment, you will have to enter your own work inputs to measure your progress");
                        alert("The blue line will be your daily work inputs for this assignment. This is not yet visible because you have not entered any work inputs");
                        if (x < 4) {
                            alert(`Note: since this assignment is due in only ${x} day${x-dif_assign === 1 ? '' : 's'}, there isn't much to display on the graph. Longer-term assignments are more effective for this visualization`);
                        }
                        alert("Once you add more assignments, they are prioritized based on their estimated completion times");
                        alert("Now that you have finished reading this, click the info icons next to each of the buttons and check out the settings to set your preferences");
                        sessionStorage.removeItem("first_login");
                    }
                }, 200);
            }
            assignment.data('not_first_click', true);
        }
    });
});