$(function() {
    function color(p) {
        return `rgb(${132+94*p},${200-109*p},${65+15*p})`;
    }
    setTimeout(function() {
        k = [1,0.9,0.7,0.7,0.5,0.2,0,0];
        const all_assignment = document.getElementsByClassName("assignment");
        (function assignmentLoop(i) {
            setTimeout(function() {
                all_assignment[all_assignment.length-i].style.background = color(k[all_assignment.length-i]);
                if (--i) {
                    assignmentLoop(i);
                }
            }, 50);
        })(all_assignment.length);
    }, !disable_transition * 400)
    // Delete button
    $('.delete-button').click(function() {
        if ($(document).queue().length === 0 && confirm('Are you sure you want to delete this assignment? (Press Enter)')) {

            // Data sent to server pointing to which assignment to delete
            let data = {
                'csrfmiddlewaretoken': csrf_token,
                'deleted': $(this).val(),
            }

            const assignment_container = $(this).parents(".assignment-container");

            // If the data was successfully sent, delete the assignment
            const success = function() {

                $(assignment_container).css({
                    // CSS doesn't allow transitions without presetting the property
                    // So, use JQuery to preset and animate its property
                    "height": $(assignment_container).height() + 20 + "px",

                    "margin-bottom": "-10px",
                    "min-height": "0",
                });
                if (!assignment_container.is(':nth-child(2)')) {
                    $(assignment_container).css("margin-top", "-10px");
                }
                $(assignment_container.children(":first-child")).css({
                    "position": "absolute",
                    "opacity": "0",
                });
                $(assignment_container).animate({
                    height: "10px"
                }, 500, () => $(assignment_container).remove());
            }
            // Use an ajax POST to avoid a page reload which will replay the starting animation
            $.ajax({
                type: "POST",
                data: data,
                success: success,
                error: function(jqXHR, exception) {
                    if (jqXHR.status == 0) {
                        alert('Failed to connect');
                    } else if (jqXHR.status == 404) {
                        alert('Requested page not found, try again');
                    } else if (jqXHR.status == 500) {
                        alert('Internal server error. Please contact me if you see this')
                    } else if (exception === 'parsererror') {
                        alert('Requested JSON parse failed');
                    } else if (exception === 'timeout') {
                        alert('Timeout error');
                    } else if (exception === 'abort') {
                        alert('Request aborted');
                    } else {
                        alert('Uncaught Error, \n' + jqXHR.responseText);
                    }
                }
            });
        }
    });

    // Hide and show estimated completion time
    $("#hide-button").click(function() {
        $(this.previousSibling).toggle();
        this.innerHTML = this.innerHTML === 'Hide' ? 'Show' : 'Hide';
    });
    
    // Entire graph
    let dat = JSON.parse(document.getElementById("load-data").textContent);
    let [warning_acceptance, def_min_work_time, def_skew_ratio, def_nwd, ignore_ends, show_progress_bar, show_past, translatez, priority_display] = dat[0],
        scale = window.devicePixelRatio;

    function PreventArrowScroll(e) {
        // arrow keys
        var e = e || window.event;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    }
    $(".assignment").click(function(e) {
        var e = e || window.event;
        if ($(document).queue().length === 0 && !["A", "IMG", "BUTTON", "CANVAS", "INPUT"].includes(e.target.tagName)) {
            let assignment = $(this);
            const graph_container = assignment.find(".graph-container"),
                not_first_click = assignment.data('not_first_click');
            if (graph_container.attr("style") && assignment.hasClass("disable-hover") /* Allow assignment to be open while it's closing */ ) {
                assignment.removeClass("disable-hover");
                assignment.on("transitionend", function(e) {
                    var e = e || window.event;
                    if (e.originalEvent.propertyName === "min-height") {
                        // Hide assignment when height transition ends
                        assignment.removeAttr("style");
                        graph_container.removeAttr("style");
                        assignment.off("transitionend");
                    }
                });
                assignment.attr("style", "overflow: hidden");
                graph_container.attr("style", "position: absolute;display: block");
                this.querySelector(".fallingarrowanimation").beginElement();

                // If no graphs are open, allow arrow scroll
                if ($(".disable-hover").length === 0) {
                    window.removeEventListener("keydown", PreventArrowScroll, false);
                }
            } else {
                // Prevents auto scroll if a graph is open
                if ($(".disable-hover").length === 0) {
                    window.addEventListener("keydown", PreventArrowScroll, false);
                }
                assignment.addClass("disable-hover");
                graph_container.attr("style", "display: block");
                this.querySelector(".risingarrowanimation").beginElement();

                let graph = this.querySelector('.graph'),
                    fixed_graph = this.querySelector('.fixed-graph'),

                    selected_assignment = dat[Array.prototype.indexOf.call(this.parentNode.parentNode.children, this.parentNode)],
                    [file_sel, ad, x, unit, y, works, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd, fixed_mode, dynamic_start, total_mode, remainder_mode] = selected_assignment;
                ad = new Date(ad + " 00:00");
                x = Math.round((Date.parse(x + " 00:00") - ad) / 86400000);
                nwd = nwd.map(Number);
                let mods,
                    skew_ratio_lim = 10000,

                    red_line_start_x = fixed_mode ? 0 : dynamic_start,
                    red_line_start_y = fixed_mode ? 0 : works[red_line_start_x - dif_assign],
                    assign_day_of_week = ad.getDay(),
                    len_works = works.length,
                    draw_point = false,
                    y_fremainder = (y - red_line_start_y) % funct_round,
                    ignore_ends_mwt = ignore_ends && min_work_time,
                    len_nwd = nwd.length,
                    set_skew_ratio = false,
                    min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round,
                    width,
                    height,
                    wCon,
                    hCon,
                    a,
                    b,
                    cutoff_transition_value,
                    cutoff_to_use_round,
                    return_y_cutoff,
                    return_0_cutoff;

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
                set_mod_days();

                function resize(reversescale) {
                    if (assignment.hasClass("disable-hover") && assignment.is(":visible")) {
                        ({width, height} = fixed_graph.getBoundingClientRect());
                        if (reversescale) {
                            width /= 1.005;
                            height /= 1.05;
                        }
                        scale = window.devicePixelRatio;
                        graph.width = width * scale;
                        graph.height = height * scale;
                        fixed_graph.width = width * scale;
                        fixed_graph.height = height * scale;
                        wCon = (width - 55) / x;
                        hCon = (height - 55) / y;
                        drawfixed();
                        draw();
                    }
                }

                resize(true);

                // calling getBoundingClientRect() returns the scale(1.05) height and width
                assignment.on("transitionend", function(e) {

                    // Resize again when width transition ends
                    var e = e || window.event;
                    if (e.originalEvent.propertyName === "width") {
                        // Don't remove this event listener because it might mess up the above event listener also on .assignment
                        resize(false);
                    }
                });
                
                // Sets event handlers only on the assignment's first click
                if (!not_first_click) {
                    // Graph resize event handler
                    $(window).resize(() => resize(false));

                    let ajax,
                        old_skew_ratio;
                    function AjaxSkewRatio() {
                        clearTimeout(ajax);
                        selected_assignment[7] = skew_ratio;
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
                                error: function(response, exception) {
                                    if (response.status == 0) {
                                        alert('Failed to save');
                                    } else if (response.status == 404) {
                                        alert('Requested page not found, try again');
                                    } else if (response.status == 500) {
                                        alert('Internal server error. Please contact me if you see this');
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
                            });
                        }, 1000);
                    }

                    // Up and down arrow event handler
                    let graphtimeout, // set the hold delay to a variable so it can be cleared key if the user lets go of it within 500ms
                        fired = false, // $(document).keydown( fires for every frame a key is held down. This fires it only once
                        graphinterval, // set the interval to a variable so it can be cleared
                        whichkey // Determines if the user is holding up or down arrow
                    function ChangeSkewRatio() {

                        skew_ratio = whichkey === "ArrowDown" ? (skew_ratio - 0.1).toFixed(1) : (+skew_ratio /* Force addition instead of concatination */ + 0.1).toFixed(1);




                        // skew ratio lim
                        if (funct(1, false) === y && whichkey === "ArrowUp" || !funct(len_nwd ? x - red_line_start_x - Math.floor((x - red_line_start_x) / 7) * len_nwd - mods[(x - red_line_start_x) % 7] - 1 : x - red_line_start_x - 1, false) && whichkey === "ArrowDown") {
                            skew_ratio = 2 - skew_ratio;
                        }
                        AjaxSkewRatio();
                        draw();
                    }

                    // Up/down keybind handler
                    $(document).keydown(function(e) {
                        var e = e || window.event;
                        if ($(fixed_graph).is(":visible")) {
                            const rect = fixed_graph.getBoundingClientRect();
                            if (rect.bottom - rect.height / 5 > 70 && rect.y + rect.height / 5 < window.innerHeight && !fired) {
                                fired = true;
                                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                    whichkey = e.key;
                                    ChangeSkewRatio()
                                    graphtimeout = setTimeout(function() {
                                        clearInterval(graphinterval);
                                        graphinterval = setInterval(ChangeSkewRatio, 13); // Draws every frame
                                    }, 500);
                                }
                            }
                        }
                    });
                    $(document).keyup(function(e) {
                        var e = e || window.event;
                        fired = false;
                        if (e.key === whichkey) {
                            clearTimeout(graphtimeout);
                            clearInterval(graphinterval);
                        }
                    });

                    // Setting and stopping set skew ratio handler
                    let update = false;
                    this.querySelector(".set-skew-ratio-button").onclick = function() {
                        this.innerHTML = "Hover and click the graph";
                        graph.addEventListener('mousemove', mousemove); // enable set skew ratio if button is pressed
                        update = true;
                    }

                    graph.onclick = function() {
                        if (update) {
                            // stop set skew ratio if canvas is clicked
                            $(this).next().find(".set-skew-ratio-button").html("Set skew ratio");
                            graph.removeEventListener("mousemove", mousemove);
                            AjaxSkewRatio();
                            update = false;
                        }
                    }

                    // Dynamically update skew ratio from textbox
                    $(".sr-textbox").on("change keyup paste click", function(e) {
                        var e = e || window.event;
                        if (old_skew_ratio === undefined) {
                            old_skew_ratio = skew_ratio;
                        }
                        if (e.target.value) {
                            skew_ratio = e.target.value;
                        } else {
                            skew_ratio = old_skew_ratio;
                            old_skew_ratio = undefined;
                        }




                        // skew ratio lim for this
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
                function pset(x2 = NaN, y2 = NaN) {
                    try {
                        var x1 = x - red_line_start_x,
                            y1 = y - red_line_start_y;
                        if (len_nwd) {
                            x1 -= Math.floor(x1 / 7) * len_nwd + mods[x1 % 7];
                        }
                        if (isNaN(x2)) {
                            a = y1 * (1 - skew_ratio) / ((x1 - 1) * x1);
                            b = (y1 - x1 * x1 * a) / x1;
                        } else {
                            x2 = (x2 - 50) / wCon - red_line_start_x;
                            y2 = (height - y2 - 50) / hCon - red_line_start_y;
                            if (x2 < 0) {
                                skew_ratio = skew_ratio_lim;
                                throw "definevars";
                            }
                            if (len_nwd) {
                                const floorx2 = Math.floor(x2);
                                if (nwd.includes((assign_day_of_week + floorx2 + red_line_start_x) % 7)) {
                                    x2 = floorx2;
                                }
                                x2 -= Math.floor(x2 / 7) * len_nwd + mods[floorx2 % 7];
                            }
                            if (x2 >= x1) {
                                a = y1 / x1;
                                b = a * (1 - x1);
                                skew_ratio = 2 - skew_ratio_lim;
                            } else {
                                if (remainder_mode) {
                                    y2 -= y_fremainder;
                                }
                                a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
                                b = (y1 - x1 * x1 * a) / x1;
                                skew_ratio = (a + b) * x1 / y1;
                                if (skew_ratio > skew_ratio_lim) {
                                    skew_ratio = skew_ratio_lim;
                                } else if (skew_ratio < 2 - skew_ratio_lim) {
                                    skew_ratio = 2 - skew_ratio_lim;
                                } else if (0.975 < skew_ratio && skew_ratio < 1.025) {
                                    if (!x1) {
                                        throw "zerodivision1";
                                    }
                                    skew_ratio = 1;
                                    a = 0;
                                    b = y1 / x1;
                                }
                                console.log("Skew ratio: " + skew_ratio);
                            }
                        }
                        if (!Number.isFinite(a)) {
                            throw "zerodivision2";
                        }
                    } catch {
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
                    if (return_y_cutoff < 1000) {
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
                        if (return_0_cutoff < 0) {
                            return_0_cutoff++;
                        }
                    } else {
                        return_0_cutoff = 1;
                    }
                    if (x1 - return_0_cutoff < 1000) {
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

                function mousemove(e) {
                    var e = e || window.event;
                    const offset = $(fixed_graph).offset();
                    let radius = wCon / 3; // calculates circle radius
                    if (radius > 3) {
                        radius = 3;
                    } else if (radius < 2) {
                        radius = 2;
                    }
                    draw(e.pageX - offset.left + radius, e.pageY - offset.top - radius);
                }

                function draw(x2 = NaN, y2 = NaN) {
                    const screen = graph.getContext("2d");
                    screen.scale(scale, scale);
                    screen.clearRect(0, 0, width, height);
                    pset(x2, y2);
                    let radius = wCon / 3; // calculates circle radius
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
                        circle_x = Math.round(point * wCon + 50);
                        if (circle_x > width - 5) {
                            circle_x = width - 5;
                        }
                        circle_y = Math.round(height - funct(point) * hCon - 50);
                        screen.lineTo(circle_x - (point === red_line_start_x) * radius / 2, circle_y); // (point===0)*radius/2 makes sure the first point is filled in properly
                        screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
                        screen.moveTo(circle_x, circle_y);
                    }
                    screen.stroke();
                    screen.beginPath();
                    radius *= 3 / 4;
                    if (len_works + 1 < line_end) {
                        line_end = len_works + 1;
                    }
                    screen.strokeStyle = "rgb(1,147,255)"; // blue
                    screen.lineWidth = radius;
                    for (let point = 0; point < line_end; point += Math.ceil(1 / wCon)) {
                        circle_x = Math.round((point + dif_assign) * wCon + 50);
                        if (circle_x > width - 5) {
                            circle_x = width - 5
                        }
                        circle_y = Math.round(height - works[point] * hCon - 50);
                        screen.lineTo(circle_x - (point === 0) * radius / 2, circle_y);
                        screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
                        screen.moveTo(circle_x, circle_y);
                    }
                    screen.stroke();
                    screen.scale(1 / scale, 1 / scale);
                }

                function drawfixed() {
                    // bg gradient
                    let screen = fixed_graph.getContext("2d");
                    screen.scale(scale, scale);
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
                    screen.measureText(Math.floor(x))
                    if (unit === "Minute") {
                        var text = 'Minutes of Work',
                            label_x_pos = -2;
                    } else {
                        var text = `${unit}s (${format_minutes(ctime)} per ${unit})`,
                            label_x_pos = -4;
                    }
                    if (screen.measureText(text).width > height - 50) {
                        text = unit + 's';
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
                    let font_size = 16.90625 - Math.ceil(y - y % y_axis_scale).toString().length * 1.71875;
                    if (y >= 10) {
                        const small_y_axis_scale = y_axis_scale / 5;
                        if (font_size < 8.5) {
                            font_size = 8.5;
                        }
                        screen.font = font_size + 'px Open Sans';
                        const text_height = screen.measureText(0).width * 2,
                            label_index = text_height < small_y_axis_scale * hCon;
                        for (let smaller_index = 1; smaller_index <= Math.floor(y / small_y_axis_scale); smaller_index++) {
                            const displayed_number = smaller_index * small_y_axis_scale;
                            if (smaller_index % 5) {
                                screen.fillStyle = "rgb(215,215,215)";
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

                    font_size *= 1.2;
                    screen.font = font_size + 'px Open Sans';
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
                        });

                        tar2.animate({
                            top: tar1.offset().top - tar2.offset().top,
                            marginTop: "+=" + (tar1_height - tar2_height),
                        }, {
                            queue: false,
                            duration: swap_ms,
                            complete: function() {
                                tar2.after("<span id='swap-temp' style='display: none;'></span>");
                                tar2.insertAfter(tar1);
                                tar1.insertBefore("#swap-temp");
                                tar1.removeAttr("style");
                                tar2.removeAttr("style");
                                $("#swap-temp").remove();
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