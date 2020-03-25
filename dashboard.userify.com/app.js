/* Copyright (c) 2019 or as noted */
/* pkg */
var _ajax = _ajax || {};
var DEBUG = Cookies.get("DEBUG") || false;
if (DEBUG) console.log("DEBUG ON");
debug_function = false;

var debug = {
  log: function(){},
  error: function(){},
  info: function(){},
  warn: function(){}
} 

if (DEBUG) debug=console;

// Pace.options = {ajax: false}

;; ///-----------------------------------\\\\


SERVER_VERSION='4.4.7-3';

;; ///-----------------------------------\\\\


SERVER_VERSION = (window['SERVER_VERSION'] ? window['SERVER_VERSION']: 4.3);
app.version = SERVER_VERSION;

;; ///-----------------------------------\\\\


// Server Status
//
var server_status = {};
var shown_license_error = false;

app.update_status = function() {

  if (server_status.edition) app.edition = server_status.edition;
  if (app.edition) app.edition_lower = app.edition.toLowerCase();
  if (server_status.editions) app.editions = server_status.editions;
  if (server_status.name) app.name = server_status.name;
  if (server_status.version) app.version = server_status.version;
  if (server_status.copyright) app.copyright = server_status.copyright;

  if (server_status.custom_logo) {
    current_theme_settings.light_navbar_logo = "api/userify/logo/width/180/height/50/object_id/server_logo";
    current_theme_settings.dark_navbar_logo = "api/userify/logo/width/180/height/50/object_id/server_logo";
    current_theme_settings.login_logo = "api/userify/logo/width/180/height/50/object_id/server_logo";
    app.click_toggle_lights();
    app.click_toggle_lights();
  }

  $(".hide_on_load").hide();
  if (server_status.license_error && server_status.license_error != "") {
    if (!shown_license_error) {
      shown_license_error = true;
      swal({
          title: "License Error",
          text: server_status.license_error + " \nSome functions may not perform as expected.\nPlease contact enterprise@userify.com to renew your license.",
          type: "warning",
          showCancelButton: false,
          confirmButtonColor: "#BB1B1B",
          confirmButtonText: "OK"
      });
    }
  }
  if (server_status.hidden_add_company) {
    $(".stage .hidden_add_company").hide();
  }
  if (app.edition_lower != "cloud") {

    // hide forgot password if
    // LDAP configured:
    if (server_status.ldap_configured) {
      $(".forgot_password").hide();
      $(".hidden_ldap").hide();
      $(".hidden_ldap").hide();
    }

    // hide signup link if not cloud and
    // first company already created
    // if (server_status.hidden_signup && !app.invite_code)
    //   $(".hidden_signup").hide();

  }

  fillup_filters.edition = app.edition_lower;
  fillup_filters.debug = (DEBUG) ? "on" : "off";

}

// add a function to this object to
// have it called on server status change
var background_status = [app.update_status];

(run_background_status_tasks = function(){
  Pace.ignore(function(){
    api.status_deferred()
    .then(function(data) {
      // make this global
      server_status = data;
      for (var task in background_status) {
        task();
      }
      setTimeout(run_background_status_tasks, 250);
    });
  });
})();

// update server license count
app.update_server_license_count = function() {
  var server_count = "";
  if (server_status.current_servers) {
    server_count = server_status.current_servers;
  }
  if (server_status.max_servers) {
    if (server_count)
      server_count = server_count + "/";
    server_count = server_count +
        server_status.max_servers;
  }
  if (server_count)
    $(".max_servers").html(server_count).fadeIn(700);
}


;; ///-----------------------------------\\\\


app.debug_on = function(){Cookies.set("DEBUG", true)}
app.debug_off = function(){Cookies.remove("DEBUG")}

app.cookie_settings = DEBUG ?{} :{secure: true}

app.prepare_token = function(username, password) {
  _ajax.username = username.toLowerCase().trim();
  // non-cloud editions, to support LDAP
  // cloud overrides this method.
  _ajax.token = password;
  return _ajax.token;
}

app.forget_login = function(reload) {
  _ajax.username = _ajax.token = invitation = "";
  console.log("Logging out");
  Cookies.remove("otp_token");
  Cookies.remove('otp_token', { path: '/' });
  Cookies.remove("mfa-shared-token");
  Cookies.remove("mfa-shared-token", { path: '/' });
  Cookies.remove("username");
  Cookies.remove("token");
  // force complete reload
  if (reload) {
    console.log("Wipe Login, forcing page reload.");
    location.reload();
  }
}

/*
app.hash256 = function(val, salt) {
  // pre-hash function
  var salt = salt || "";
  var shaObj = new jsSHA(val + salt, "TEXT");
  var hash = shaObj.getHash("SHA-256", "HEX");
  return hash
}
*/

app.click_logout = function() {
  // // console.log("Logging out, deleting cookies and stateful tokens");
  // always remove old mfa acceptance cookie
  Cookies.remove("mfa-acceptance");
  Cookies.remove("mfa-acceptance", { path: '/' });
  swal({
    title: "Log Out",
    text: "This will log you out. Are you sure?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Log Out",
    closeOnConfirm: true
  }, function() { app.forget_login(true) });
}


;; ///-----------------------------------\\\\


function getMedian(args) {
  if (!args.length) {return 0};
  var numbers = args.slice(0).sort((a,b) => a - b);
  var middle = Math.floor(numbers.length / 2);
  var isEven = numbers.length % 2 === 0;
  return isEven ? (numbers[middle] + numbers[middle - 1]) / 2 : numbers[middle];
}

app.setup_billing_settings = function(billing, target) {
  // update dates
  var d = new Date();
  $(".date-selector select[name='month-select'] > option[value='" + (d.getMonth() + 1) + "']",
    billing).prop("selected", true);
  $(".date-selector select[name='year-select'] > option[value='" + d.getFullYear() + "']",
    billing).prop("selected", true);
}

app.setup_display_company_usage = function(obj, evt, args) {
  var table = $("<table style='width: 100%;' class='table table-striped display'>");
  var thead = $("<thead>");
  var row = $("<tr>");
  var th = $("<th>Project Name</th>"); row.append(th);
  var th = $("<th>Server Group Name</th>"); row.append(th);
  var th = $("<th>Median Servers</th>"); row.append(th);
  var th = $("<th>Maximum Servers</th>"); row.append(th);
  // var th = $("<th>Users (med/max)</th>"); row.append(th);
  var th = $("<th>Amount</th>"); row.append(th);
  thead.append(row);
  table.append(thead);
  $(".stage .usage_display").empty().append(table);
  app.billing_table_body = $("<tbody>");
  table.append(app.billing_table_body);
  app.billing_table_body.append("<td colspan=5>Just a moment..</td>");
}

app.click_display_company_usage = function(obj, evt, args) {

  var old = $(obj).text();
  $(obj).disable().text("Just a moment..");
  $(".stage .billing-usage .report_totals").empty()

  app.display_company_usage = function(data, historical) {

    $(obj).enable().text(old);
    app.billing_table_body.empty();

    if (data.usage.projects.length < 1) {
      app.billing_table_body.append("<td colspan=5>No Server Groups Found.</td>");
    }

    $.each(data.usage.projects, function(project_id, project_data) {
      var project = app.get_project_by_id(company, project_id);
      if (project.parent_id != "") {
        var parent_project = app.get_project_by_id(company, project.parent_id);
        var row = $("<tr>");
        var name = safify(project.name);
        var parent_name = safify(parent_project.name);
        var td = $("<td>" + safify(parent_name) + "</td>"); row.append(td);
        var td = $("<td>" + safify(name) + "</td>"); row.append(td);
            // Minimum: Math.min.apply(null, project_data.server_counts) + "/"
        var td = $("<td>"
            + getMedian(project_data.server_counts)
            + "</td>"); row.append(td);
        var td = $("<td>"
            + Math.max.apply(null, project_data.server_counts)
            + "</td>"); row.append(td);
        var td = $("<td>$" + project_data.monthly_price.toFixed(2) + "</td>"); row.append(td);
        app.billing_table_body.append(row);
      }
    });

    // Data Table
    /*
    dt = table.DataTable({
      buttons: [ 'copy', 'csv', 'excel' ],
      colReorder: true,
      fixedColumns: {leftColumns: 2},
      fixedHeader: true,
      keys: true,
      responsive: true,
      rowReorder: false,
      iDisplayLength: 50,
      // (index):7043 Uncaught TypeError: Cannot read property 'appendChild' of undefined
      scroller: true,
      order: [[0,'asc'],[4,'desc']],
      columnDefs: [{ "type": "currency", targets: 4}],
      select: false
    });
    */
    $(".stage .billing-usage .report_totals").empty();
    $(".stage .billing-usage .report_totals").append(
      "<h1>" + company.name + "</h1>");

    $(".stage .usage_display").append(""
      + ((historical) ? "<h2>Account History</h2>" : "<h2>Current Utilization</h2>")
      + ((historical) ? "<h3>Month Total: $" : "<h3>Month to date: $")
      + data.usage.monthly_price.toFixed(2) + "</h3>"
      + (
          (data.usage.disc_monthly_price.toFixed(0) != data.usage.monthly_price.toFixed(0))
            ? ("<h2>After discounts: $" +  data.usage.disc_monthly_price.toFixed(2) + "</h2>")
            : ""
        )
    );

    /*
    if (data.usage.month_hours_total && data.usage.month_hours_total > 0) {
        if (data.usage.last_hour_counted && data.usage.last_hour_counted != data.usage.month_hours_total) {
            $(".stage .billing-usage .report_totals").append(
              "<h4>Hours: " +  data.usage.last_hour_counted
              + "/" + data.usage.month_hours_total
              + "</h4>"
            );
        } else {
            $(".stage .billing-usage .report_totals").append(
              "<h4>Hours: " +  data.usage.last_hour_counted
              + "</h4>"
            );
        }
    }
    */

    if (data.usage.projected_monthly_price > 0) {
        $(".stage .usage_display").append(
        // $(".stage .billing-usage .report_totals").append(
          ((historical) ? "<h5>Price: $" : "<h5>Projected Price: $")
          +  data.usage.projected_monthly_price.toFixed(2) + "</h5>"
          + ((data.usage.projected_disc_monthly_price.toFixed(0) != data.usage.projected_monthly_price.toFixed(0))
            ? ((historical) ? "<h5>Price after discounts: $" : "<h5>Projected Price after discounts: $")
            +  data.usage.projected_disc_monthly_price.toFixed(2) + "</h5>"
            : "")
        );
    }
    if (data.usage.free_service)
        $(".stage .billing-usage .report_totals").append(
            "<h2>FREE TIER</h2>Startups with less than 20 servers throughout the month are free.");

    $(".stage .usage_display").append(""
      + "<div class=printable>Thank you for your business!<br>Userify Corporation</div>");
  }

  app.setup_display_company_usage(obj, evt, args);
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var month = $(".stage .billing-usage .month-select").val();
  var year = $(".stage .billing-usage .year-select").val();
  $(".stage .billing-usage .report-for-month-year").html(
      "Report for " + month + "/" + year);

  var d = new Date();
  var _counter = 1;
  var _local_error={error: function() {
    app.billing_table_body.empty().append("<td colspan=5>Still working, sorry for the delay.. (" + _counter + ")</td>");
    _counter ++;
    if (_counter > 30){
        app.billing_table_body.empty().append("<td colspan=5>Please try again in a few minutes!</td>");
        _counter = 0;
    }else{
        localExec();
    }
  }}
  function localExec(){
      if ( (month != d.getMonth()+1) || (year != d.getFullYear())) {
        api.get_billing_historical_charges_deferred(args.company_id, year, month, _local_error)
        .then(function(data) {
            app.display_company_usage(data, true);
        });
      } else {
        api.get_billing_month_charges_to_date_deferred(args.company_id, _local_error)
        .then(app.display_company_usage, false);
      }
  }
  localExec();

  return false;

}


;; ///-----------------------------------\\\\



//
// userify-company begin
//

app.refresh_company = function(company_id) {
    app.refresh_companies(function(data) {
        app.click_company(null, null, {company_id: company_id})
    })
}

app.company_admin_only = function(company) {
    if (!company.user_is_admin) $(".stage .company_admin_only").hide();
}

app.has_perm = function(obj, perm_name) {
    return _.contains(obj.my_permissions, perm_name);
}

app.click_company_upgrade_form = function(obj, e, args) {
    // alert(args.company_id);
}

app.click_company_settings_menu = function(obj, e, args) {

    var menu = $("<div class='qtip_dropdown'>");
    var menu_buttons = [];
    // if (app.has_perm(project, "manage_project")) {
    if (false) { // {app.edition == "Cloud") {
        menu_buttons = ["button_company_settings_upgrade_plan"];
    }
    app.click_display_qtip_menu(obj, null, {
        company_id: args.company_id,
        menu_buttons: menu_buttons });

}

app.click_company = function(obj, e, args) {

    api.get_server_licensing_info_deferred();

    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    Cookies.set(_ajax.username + ":last_company", args.company_id, app.cookie_settings);

    // highlight company (shared w/ userify-company);
    $(".stage .project_menu_projects .project_menu_company").each(function() {
        var element = $(this);
        if (element.data("args").company_id == args.company_id)
            element.addClass("active");
        else
            element.removeClass("active");
    });

    Cookies.remove(_ajax.username + ":last_project");
    // unhighlight project (shared)
    $(".stage .project_menu_projects .project_menu_project").each(function() {
        $(this).removeClass("active");
    });

    app.hide_tips();

    // activate main application window view (esp on mobile)
    app.click_display_mainapp();
    $(".stage .mainapp").fillup("company_view");

    // formplode the data that we got from project (i.e., name) back
    // onto the main app form.
    // already sanitized on the server:
    $(".stage .mainapp form").formplode(company, do_not_safify);

    // just add company_id arg to EVERY button in this and go from there.
    $(".stage .company_view form [data-ah-action]").data("args", args);

    // hide delete company if more than one project
    if ((company.projects) && company.projects.length > 0)
        $(".stage .delete_company").hide();

    $(".stage .company_view form span.company_name").editable({
        type: "text",
        title: "Enter New Company Name",
        value: unsafify(company.name),
        success: function(response, new_value) {
            var newname = {"name": new_value};
            if (!new_value || new_value == "") newname = {"name": "Unnamed company"};
            api.update_company_deferred(args.company_id, newname)
            .then(app.refresh_companies);
            // update_cache("companies", args.company_id, name, newname);
        }
    });
    $(".stage .company_view form span.company_notes").editable({
        type: "textarea",
        title: "Enter New Company Contact",
        value: unsafify(company.notes),
        success: function(response, new_value) {
            var notes = {"notes": new_value};
            api.update_company_deferred(args.company_id, notes)
            .then(app.refresh_companies);
        }
    });

    /* display project list */
    var top_level_projects = app.sorted_projects(
        app.project_ids_to_projects(company,
            app.top_level_project_ids(company)));

    var project_list = $(".stage .company_view form .company-projects");

    if (top_level_projects.length != 0)
        project_list.empty();
    else
        /*
        $(".stage .add_project").qtip({
            content: 'Click + to add a new project!',
            style: app.qtip_theme,
            show: true,
            position: {
                adjust: { method: "none shift" },
                // viewport: $(window),
                viewport: $(".stage"),
                my: "top right",// position of the arrow
                at: "bottom left"// where pointing at the button
            }
        });
        */
        app.intro_msg(
            "no_projects",
            "Create a Project.",
            "Create a project to hold server groups."
            + " Project names can be whatever you like."
            + " Click the Projects tab and <i class='fa fa-plus-circle'></i> to add a project."
            // + " Click the project name to rename it later."
            // this doesn't work because company_id is not added to data.args...
            // + '<button style="text-align:left; color:white" class="link company_admin_only add_project pointer"'
            // + ' data-ah-action="add_project">'
            // + 'Click New Project to add a new project.'
            // + '<i data-ah-action="add_project" class="fa fa-plus-circle"></i></button>'
        );


    _.each(top_level_projects, function(project) {
        // return;

        // clickable for desktops..
        var $project = $(
            '<div class="project_menu_project"'
                + ' data-ah-action="project"'
                // this causes a weird bug
                // + ' data-ah-flip="click:project_view,mainapp"'
                + '>' + do_not_safify(project.name) + '</div>');

        $project.data("args", {
            company_id: args.company_id,
            parent_project_id: project.id,
            project_id: project.id});
        project_list.append($project);

    });

    /* display user list */

    var top_level_users = company.users;
    var user_list = $(".stage .company_view form .company-users");

    if (top_level_users.length != 0) {
        user_list.empty();
    }
    if (top_level_users.length < 2) {
        app.intro_msg(
            "no_users",
            "Invite a user.",
            "Invite a user to join your company. You manage their permissions, while"
            + " they manage their SSH keys."
        );
    }

    if (top_level_users) {

        var table = $("<div class=outer_users>");
        user_list.append(table);

        // var requested_users = top_level_users.join(",")
        var requested_users = "*"

        api.get_company_users_deferred(company.id, requested_users).then(function(users) {
            _.each(users.users, function(user) {

                var user_args = {company: company, user: user}

                var $user = $(
                    '<div class="row_wrapper user_row">'
                        + app.draw_user_box(user, args)
                        + '<div class="row_wrapper buttons pull-right"></div></div>'
                        + '</div>');
                table.append($user);

                // remove button, promote button, etc..
                //
                var draw_company_button = function(idx, button_name) {
                    var button = $(fillup("button_company_users_" + button_name));
                    // be sure to attach data to the appropriate [data-ah-action]
                    $("[data-ah-action]", button).data("args", user_args);
                    $(".buttons", $user).append(button);
                }

                if (app.edition_lower != "xxx_cloud") {
                    if (_.contains(company.admins, user.id)) {
                        if (company.admins.length > 1)
                            draw_company_button(0, "demote_user_from_company_admin");
                    } else {
                        draw_company_button(0, "promote_user_to_company_admin");
                    }
                }

                draw_company_button(0, "remove_user");

                $user.data(user_args);

            });
            app.company_admin_only(company);
            app.display_tooltips();

        });
    }

    app.hide_progress();
    scroll_top();

    app.company_admin_only(company);
}

app.click_demote_user_from_company_admin = function(obj, e, args) {

    var company = args.company;
    var user = args.user;
    var name = user.name;
    if (! name) name = user.username;
    if (! name) name = user.email;
    if (! name) name = user.id;

    swal({
        title: "Are you sure?",
        imageUrl: "/api/userify/logo/object_id/" + user.id,
        text: "You are removing company administrator permissions for "
            + name
            + ".",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "REMOVE",
        closeOnConfirm: false
    }, function(){
        api.remove_user_id_from_company_usergroup_deferred(
            args.company.id,
            "company_admins",
            args.user.id
        ).then(function() {
            swal.close();
            app.refresh_company(args.company.id);
            scroll_top();
      });
    });
}

app.click_promote_user_to_company_admin = function(obj, e, args) {

    var company = args.company;
    var user = args.user;
    var name = user.name;
    if (! name) name = user.username;
    if (! name) name = user.email;
    if (! name) name = user.id;

    swal({
        title: "Are you sure?",
        imageUrl: "/api/userify/logo/object_id/" + user.id,
        text: "You are granting company administrator permissions to "
            + name
            + ".",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "GRANT",
        closeOnConfirm: false
    }, function(){
        api.add_user_id_to_company_usergroup_deferred(
            args.company.id,
            "company_admins",
            args.user.id
        ).then(function() {
            swal.close();
            app.refresh_company(args.company.id);
            scroll_top();
        });
    });
}

app.click_remove_company_user = function(obj, e, args) {

    var company = args.company;
    var user = args.user;
    var name = user.name;
    if (! name) name = user.username;
    if (! name) name = user.email;
    if (! name) name = user.id;

    swal({
        title: "Are you sure?",
        imageUrl: "/api/userify/logo/object_id/" + user.id,
        text: "You will not be able to recover user "
            + name
            + "'s permissions once deleted.",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, remove this user!",
        closeOnConfirm: false
    }, function(){
        swal.close();
        app.show_progress();
        api.remove_company_user_deferred(company.id, user.id).then(function(data) {
            app.hide_progress();
            if (data.status == 'success') {
                    app.refresh_companies(function() {
                        swal("Deleted!",
                            "User" + name + " has been removed.",
                             "success");
                        swal.close();
                        app.refresh_company(args.company.id);
                        scroll_top();
                    });
            }
        })
    });
}

app.click_delete_company = function(obj, e, args) {
    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    var name = (company) ? ((company.name) ? company.name : "") : "";
    swal({
        title: "Are you sure?",
        text: "You will not be able to recover company "
            + name
            + " once deleted. This will remove all users.",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: false
    }, function(){
        // swal({
        //     title: "Are you REALLY REALLY sure?",
        //     text: "DELETING " + name
        //         + ". This is irreversible.",
        //     type: "error",
        //     showCancelButton: true,
        //     confirmButtonColor: "#DD6B55",
        //     confirmButtonText: "DELETE!",
        //     closeOnConfirm: false
        // }, function(){
            app.show_progress();
            swal.close();
            api.delete_company_deferred(args.company_id)
            .then(function(data) {
                app.hide_error();
                app.hide_progress();
                if (data.status == 'success') {
                    app.refresh_companies(function() {
                        swal("Deleted!",
                            "Company " + name + " has been deleted.",
                             "success");
                        // swal.close();
                        app.click_view_profile();
                        scroll_top();
                    });
                }
            });
        // });
    });
}


app.click_add_company = function(obj, e, args) {
    swal({
        title: "Create Company",
        text: "Please enter the new company name. This is invisible to anyone except you invite and can be changed later.",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "New Company Name"
    },
    function (company_name) {
        if (company_name === false) return false;

        if (company_name === "") {
            swal.showInputError("Need a company name. You can change this later.");
            return false
        }
        var new_company = {name: company_name};
        app.show_progress();
        swal.close();
        /* actually create company */
        api.create_company_deferred(new_company)
        .then(function(data) {

            app.hide_error();
            app.hide_progress();
            if (data.status != "success") {
                swal("Oops!",
                    "Creating new company " + company_name + " didn't work. :(",
                    "error");
                return false;
            }

            // server_status.hidden_add_company = true;
            // server_status.hidden_signup = true;
            $(".stage .hidden_add_company").hide();
            new_company.id = data.company_id;
            cache_objects("companies", {company_id: new_company});
            app.refresh_companies(function() {
                $(".stage h1 span.company_name").highlight();
                swal.close();
                app.click_company(null, null, {company_id: new_company.id});
            });
            scroll_top();
        });
        return false;

    });
}

app.click_invite_company_user = function(obj, e, args) {

    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    app.hide_tips();
    swal.close();
    app.click_display_mainapp();
    $(".stage .mainapp").fillup("user_bulk_invite");
    $(".stage .mainapp [data-ah-action]").data({"args": {"company_id": args.company_id}});
}

app.click_bulk_invite = function(obj, e, args) {

    var invitee_emails = $(".stage .mainapp textarea.bulk_invite_input").val();
    invitee_emails = invitee_emails.replace(/(?:\r\n|\r|\n)/g, ',');
    app.invite_users(args.company_id, invitee_emails);

}

app.click_invite_single_company_user = function(obj, e, args) {
    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    if (!server_status.ldap_configured)
        var invite_action = "Add";
    else
        var invite_action = "Invite";
    swal({
        title: invite_action + " user to " + company.name,
        text: "Please provide an email address or username. <span class=link data-ah-action=invite_company_user>(Bulk)</span>",
        html: true,
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "Email address"
    },
    function (invitee_email) {
        if (invitee_email === false) return false;

        if (invitee_email === "") {
            swal.showInputError("Please provide an email address or username.");
            return false
        }

        app.invite_user(company.id, invitee_email);

    });
    $(".sweet-alert [data-ah-action=invite_company_user]").data({"args": {"company_id": args.company_id}});

}

app.invite_users = function(company_id, invitee_emails) {
    api.invite_company_user_deferred(company_id, invitee_emails, {
        error: function(xhr, textStatus, errorThrown) {
            app.hide_progress();
            app.hide_error();
            api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
                api.display_error(errormsg);
            });
        }
    })
    .then(function(data) {
        app.hide_error();
        if (data.status == "success") {
            swal("Invited!", "Your users should expect invites shortly.", "success");
        } else {
            swal("Error", "Invites could not be sent.", "error");
        }
        app.refresh_company(company_id);
    });
}

app.invite_user = function(company_id, invitee_email) {
    api.invite_company_user_deferred(company_id, invitee_email, {})
    .then(function(data) {
        app.hide_error();
        if (data.status == "success" && data.added_existing_user === false) {
            swal("Success", "" + invitee_email + " was invited at this URL:\n" + data.invite_url + "\nDon't forget to create a project and server group to assign permissions.", "success");
        }
        else if (data.status == "success" && data.added_existing_user === true) {
            swal("Success", "" + invitee_email + " was added to your company and can now be managed.", "success");
            app.refresh_company(company_id);
        }
        else {
            swal("Error", "Invite could not be sent to " + invitee_email, "error");
        }
    });
}

// userify-company end
//


;; ///-----------------------------------\\\\


app.click_add_company = function(obj, e, args) {
    swal({
        title: "Create Company",
        text: "Please enter the new company name. This is invisible to anyone except you invite and can be changed later.",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "New Company Name"
    },
    function (company_name) {
        if (company_name === false) return false;

        if (company_name === "") {
            swal.showInputError("Need a company name. You can change this later.");
            return false
        }
        var new_company = {name: company_name};
        app.show_progress();
        swal.close();
        /* actually create company */
        api.create_company_deferred(new_company)
        .then(function(data) {

            app.hide_error();
            app.hide_progress();
            if (data.status != "success") {
                swal("Oops!",
                    "Creating new company " + company_name + " didn't work. :(",
                    "error");
                return false;
            }

            // server_status.hidden_add_company = true;
            // server_status.hidden_signup = true;
            $(".stage .hidden_add_company").hide();
            new_company.id = data.company_id;
            cache_objects("companies", {company_id: new_company});
            app.refresh_companies(function() {
                $(".stage h1 span.company_name").highlight();
                swal.close();
                app.click_company(null, null, {company_id: new_company.id});
            });
            scroll_top();
        });
        return false;

    });
}

;; ///-----------------------------------\\\\


// userify-company-lib begin

app.sorted_projects = function(projects) {
    return _.sortBy(projects, 'name');
}

app.get_company_by_id = function(companies, company_id) {
    var company = _.find(companies, function(company) { return company.id == company_id });
    return company;
}

app.get_project_by_id = function(company, project_id) {
    if (project_id) {
        var project = _.find(company.projects, function(project) { return project.id == project_id });
        return project;
    }
}

app.get_project_children = function(company, project_id) {
    return _.filter(company.projects, function(project) {
        return (project.parent_id == project_id) });
}

app.top_level_project_ids = function(company) {
    var project_ids = [];
    _.each(company.projects, function(project) {
        if (!project.parent_id) { project_ids.push(project.id) } });
    return project_ids;
}

app.project_ids_to_projects = function(company, project_ids) {
    return _.filter(company.projects, function(project) {
        return project_ids.indexOf(project.id) != -1 });
}

app.project_tree = function(company) {
    var top_level_projects = app.sorted_projects(
        app.project_ids_to_projects(company,
            app.top_level_project_ids(company)));
    // console.log(top_level_projects);
    (function descend_levels(project_tier) {
        _.each(project_tier, function(project) {
            // console.log(project.id);
            // project.projects = app.get_project_children(company, project.id);
            projects = app.sorted_projects(
                app.project_ids_to_projects(
                    company, app.get_project_children(company, project.id)));
            // console.log(projects);
            // descend_levels(project.projects);
        });
    }(top_level_projects));
}

// userify-company-lib end



;; ///-----------------------------------\\\\


app.click_company_settings = function(obj, e, args) {
    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    app.hide_tips();
    app.click_display_mainapp();
    $(".stage .mainapp").fillup("company_settings");
    $(".stage .mainapp button").data({"args": {"company_id": args.company_id}});
    $(".stage .mainapp form").formplode(company);
    $(".stage .company-policies").formplode(company);
}

app.click_save_company_policies = function(obj, e, args) {
    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    console.log(company);
    var data = $(".company-policies").formscrape();
    console.dir(data);
    api.update_company_deferred(args.company_id, data);
}

;; ///-----------------------------------\\\\


app.click_manage_users = function(obj, e, args) {
    $(".stage .company_view form button").data("args", args);
}

;; ///-----------------------------------\\\\


app.click_submit_new_credit_card = function(obj, evt, args) {

  evt.preventDefault();
  $(obj).disable();

  if (!args.company_id) {
    swal("Error updating card.",
      "Sorry, no company_id was provided. Please reload the company list or contact support@userify.com.",
      "error");
    return
  }

  var ccform = $(".billing-update-card", ".stage").formscrape();
  ccform.name = args.company_id;
  console.dir(ccform);

  // not sure where these are getting scraped from?
  if (ccform["month-select"]) delete ccform["month-select"];
  if (ccform["year-select"]) delete ccform["year-select"];

  // munge data to what stripe likes.

  var _wait_for_stripe = function() {

    // if Stripe isn't available, load and wait
    if (!window.Stripe) {
      load_js("https://js.stripe.com/v2/", "javascript-stripe-script");
      setTimeout(_wait_for_stripe, 50);
      return
    }

    Stripe.setPublishableKey(stripe_pubkey);
    Stripe.card.createToken(ccform, function(status, response) {
      // handle response from stripe
      if (response.error) {
        $(obj).enable();
        swal("Card error", response.error.message, "error");
        // re-enable button
      } else {
        api.update_company_deferred(
          args.company_id, {"stripe_token": response.id})
        .then(function(data) {
          $(obj).enable();
          if (data.status != "success") {
            swal("Card error", response.error.message, "error");
          } else {
            var title = "Updated Card!"
            var message = "You have successfully updated your credit card.";
            if (data.title) title = data.title;
            if (data.message) message = data.message;
            swal(title, message, "success");
          }
        });
      }

    });
  }

  _wait_for_stripe();

  return false;

}

;; ///-----------------------------------\\\\


// userify 4+
app.hide_error = function() {
$(".error_msg").stop().delay(3000).fadeOut(1000);
// clear_headsup();
}

;; ///-----------------------------------\\\\


var href = s.rtrim(location.pathname,  "/");
var last_part = href.substr(href.lastIndexOf('/') + 1);
last_part = $("[href*='" + last_part + "/']");
if (last_part.length == 0)
    last_part = $("[href*='" + last_part + "']");
last_part.parent().parent().find(".active").removeClass("active");
last_part.addClass("active");
// css("background-color", "#ff9600").css("color", "#fff");

;; ///-----------------------------------\\\\


function download(filename, data){
  var element=document.createElement('a');
  element.setAttribute('href',
	 'data:application/octet-string;charset=utf-8,'
	 +encodeURIComponent(data));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

;; ///-----------------------------------\\\\


// Enterprise toggle lights
//
var current_theme_settings = {
    // toggled_logo:  "https://userify.com/media/userify-logo_2016-darkblue-blue-no-tagline.svg",
    // toggled_logo:  "https://userify.com/media/userify-logo_2016-darkblue-blue-no-tagline.svg",
    // original_logo: "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg",
    // light_navbar_logo:  "userify-white-no-tagline.svg",
    // light_navbar_logo:  "userify-white-no-tagline.svg",
    // light_navbar_logo:  "userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    // dark_navbar_logo: "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg",
    light_navbar_logo:  "/userify-logo_2016-darkblue-blue-no-tagline.svg",
    login_logo:  "/userify-logo_2016-darkblue-blue-no-tagline.svg",
    // light_navbar_logo:  "/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    // dark_navbar_logo: "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg",
    dark_navbar_logo: "https://userify.com/media/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    // login_logo: "/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    dark_fn: "/css/dark.css",
    prism_dark_fn: "/css/prism.dark.css",
    prism_light_fn: "/css/prism.light.css"
}


;; ///-----------------------------------\\\\


// Enterprise toggle lights
//
var current_theme_settings = {
    // toggled_logo:  "https://userify.com/media/userify-logo_2016-darkblue-blue-no-tagline.svg",
    // toggled_logo:  "https://userify.com/media/userify-logo_2016-darkblue-blue-no-tagline.svg",
    // original_logo: "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg",
    // light_navbar_logo:  "userify-white-no-tagline.svg",
    // light_navbar_logo:  "userify-white-no-tagline.svg",
    // light_navbar_logo:  "userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    // dark_navbar_logo: "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg",
    light_navbar_logo:  "/userify-logo_2016-darkblue-blue-no-tagline.svg",
    login_logo:  "/userify-logo_2016-darkblue-blue-no-tagline.svg",
    // light_navbar_logo:  "/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    // dark_navbar_logo: "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg",
    dark_navbar_logo: "https://userify.com/media/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    // login_logo: "/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg",
    dark_fn: "/css/dark.css",
    prism_dark_fn: "/css/prism.dark.css",
    prism_light_fn: "/css/prism.light.css"
}


;; ///-----------------------------------\\\\


/* Edition defaults */
/* specific editions may override the below methods or settings as needed. */

var base_configuration_data = {};
app.name = "Userify";
app.edition = "UNSET";

app.signup_metrics = function(obj, e, args) {}

app.display_initial_login = function() {
    // $(".navbar-brand").html('<img src="/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg">');
    // $(".login.panel img").attr("src", "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg").css("height", "32px");
    // $(".navbar-brand").fillup("logo35ondark");
    // $(".navbar-brand").fillup("logoonwhite");
    app.click_display_login_form();
}

app.set_edition = function() {
}

app.click_display_signup_payment_form = function() {
    alert("This signup function is not available in this edition.");
}

app.show_edition_features = function() {
    $(".visible-" + app.edition_lower).show();
    $(".hidden-" + app.edition_lower).hide();
    _.each(app.editions, function(edition) {
        var edition = edition.toLowerCase();
        if (app.edition_lower != edition) {
            $(".visible-" + edition).hide();
            $(".hidden-" + edition).show();
        }
    });
    $(".visible-" + app.edition_lower).show();
    $(".hidden-" + app.edition_lower).hide();
}

// Configure Server
app.click_server_configuration2 = function(obj, e, args) {
    $(".stage").fillup("welcome_configuration");
    $(".stage input#instance_id").focus();
    $(".stage input#instance_id").keydown(function() {
        $(".stage a.btn-default").removeClass("btn-default").addClass("btn-success");
    });

}
app.click_server_configuration = app.click_server_configuration2;

// Set theme
app.set_edition_theme = function() {

    //$(".navbar-brand").html('<img src="/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg">');
    // $(".navbar-brand").html('<img src="https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg" height=32 style="margin: 2px 0 0 0">');

    app.userify_theme = app.edition_lower;
    app.qtip_theme = "qtip-bootstrap";
    $(".theme").removeClass("theme-dark");
    $(".theme").removeClass("theme-day");
    $(".theme").addClass("theme-default");
    $(".bootstrap_theme").attr("href", "");
    // $(".navbar-brand").fillup("logo35onwhite");
    app.full_name = app.name + " " + app.edition + " " + app.version;
    app.edition_lower = app.edition.toLowerCase();
    $(".edition").html(app.edition.toUpperCase());

    if (app.edition_lower == "pro") {
        $(".edition").html("PROFESSIONAL");
    }

    $(".edition-titlebar").html(app.edition + " Edition");
}

app.check_instance_id = function(obj, e, args) {
    $(".stage #instance_id").change(function() {
        obj = $(this);
        app.instance_id = formscrape(".stage")['instance_id'];
        $(".stage button").prop("disable", true);
        $(".stage a").hide();
        api.check_aws_instance_id_deferred(app.instance_id,
        {error: function(){
            $(".stage .instance_id_form-group")
              .removeClass("has-success")
              .addClass("has-error");
            // hide next button (this is only on AWS)
            $(".stage .next_button").hide();
        }})
        .then(function(){
          $(".stage .instance_id_form-group")
            .addClass("has-success")
            .removeClass("has-error");
          // show next button
          $(".stage .next_button").show();
          $(".stage .btn-success").show();
        })
    });
}

app.click_s3_filesystem_config = function(obj, e, args) {
    $(".stage").fillup("base_config_s3_bucket");
    $(".stage input[name=sa_username]").accept_only_lowercase_numbers_and_underscore();
    app.check_instance_id();
}

app.click_normal_filesystem_config = function(obj, e, args) {
    $(".stage").fillup("base_config_filesystem");
    $(".stage input[name=sa_username]").accept_only_lowercase_numbers_and_underscore();
    app.check_instance_id();
}



app.click_test_settings = function(obj, e, args) {

    var base_configuration_data = formscrape(".stage form");
    if (!base_configuration_data.sa_username)
     alert("There is a problem parsing this form. Please contact support.");

    app.sa_pass = base_configuration_data.sa_password;
    base_configuration_data.sa_password = app.prepare_token(
         base_configuration_data.sa_username,
         base_configuration_data.sa_password);

    base_configuration_data['instance_id'] = app.instance_id;

    api.create_base_config_deferred(base_configuration_data
        // , {"error": function(xhr, if_error, msg) {
        // var error = xhr.responseJSON.error;
        // swal("Error " + xhr.status,  xhr.responseJSON.error, "error");
        // }}
    )
    .then(function(data) {

        if (data.status == "found_config_but_need_keys") {

            // ASK FOR KEYS:

            $(".stage .base_config_stage2")
                .fillup("base_config_prompt_keys");
                // do not
                // scroll_top();
            /*
            $(".bucket_settings_menu").css({
                opacity: ".6"
            });
            $(".server_admin_settings").css({
                opacity: ".6"
            });
            */

            $(".base_config_stage2")
                .css({
                    border: "4px dashed #ea6",
                    padding: "2rem 2rem"
                })
            ;

        } else if (data.status == "old_config_is_readable_and_base_config_was_written") {

            $(".stage .base_configuration_form")
                .fillup("base_config_confirmation")
                .formplode(base_configuration_data);
            $(".stage .base_configuration_form [data-update=sa_password]").text(app.sa_pass);

            if (base_configuration_data.filesystem_path && base_configuration_data.filesystem_path != "") {
                $('.stage .aws_settings').hide();
            } else {
                $('.stage .fs_settings').hide();
            }

            $(".stage .base_configuration_form [data-update='sa_password']").text(app.sa_pass);

            app.sa_pass = "";
            scroll_top();
            // $(".base_configuration_form").fillup("configuration_form");


        } else if (data.status == "ready_for_config") {

            // brand new config
            base_configuration_data.crypto_key = data.crypto_key;

            // grab newly generated keys and continue to load config
            $(".stage .base_configuration_form")
                .fillup("base_config_confirmation")
                .formplode(base_configuration_data);

            if (base_configuration_data.filesystem_path && base_configuration_data.filesystem_path != "") {
                $('.stage .aws_settings').hide();
            } else {
                $('.stage .fs_settings').hide();
            }

            $(".stage .base_configuration_form [data-update='sa_password']").text(app.sa_pass);

            scroll_top();
            // swal("cool", "grab newly generated keys and continue to load config");

        } else {

            swal("Oops!", "The server did not provide a proper status! Please try again.", "error");


        }

    });
}

app.click_create_new_s3_configuration = function(obj, e, args) {
    $(".stage").fillup("create_new_s3_configuration");
    // $(".stage .rootwizard").bootstrapWizard(
    //     // {onTabShow: function(tab, navigation, index) {
    //     //     var $total = navigation.find('li').length;
    //     //     var $current = index+1;
    //     //     var $percent = ($current/$total) * 100;
    //     //     $('.stage .rootwizard').find('.bar').css({width:$percent+'%'});
    //     //     // If it's the last tab then hide the last button and show the finish instead
    //     //     if($current >= $total) {
    //     //         $('.stage .rootwizard').find('.pager .next').hide();
    //     //         $('.stage .rootwizard').find('.pager .finish').show();
    //     //         $('.stage .rootwizard').find('.pager .finish').removeClass('disabled');
    //     //     } else {
    //     //         $('.stage .rootwizard').find('.pager .next').show();
    //     //         $('.stage .rootwizard').find('.pager .finish').hide();
    //     //     }
    //     //
    //     // }}
    // );
    // $('.stage .rootwizard .finish').click(function() {
    //     app.click_upload_new_s3_configuration();
    // });

}


app.click_upload_new_s3_configuration = function(obj, e, args) {
    base_configuration_data = formscrape(".stage");
    console.log("HERE");
    api.create_base_config_deferred(base_configuration_data, {"error": function(xhr, if_error, msg) {
        alert("NOT OK");
        console.dir(xhr);
        console.log(xhr.status == 404);
    }}
    )
    .then(function(data) {
        console.log("OK");
        console.dir(data);
    });
}

app.click_display_main_configuration = function(obj, e, args) {

}


/*

app._setup_server_configuration_panel = function() {


    $(".stage .configuration-body span.base_config_var").each(function() {

        var item = $(this);
        console.log("item" + item);
        console.log(item.parent().parent().parent().find("b").html());

        item.editable({
            type: "text",
            title: ("New " + item.parent().parent().parent().find("b").html() + ":"),
            value: item.text(),
            success: function(response, new_value) {
                console.log(response);
                console.log(new_value);
                var data = {};
                $(".stage .configuration-body").formscrape(data);
                console.log(data);
                console.log("HERE");
                api.create_server_config_deferred(data)
                .then(function(data) { console.dir(data) });
                // var newname = {"name": new_value};
                // api.update_project_deferred(
                //     args.company_id, args.project_id, newname)
                // .then(app.refresh_companies);
            }
        });
    });


}

// app.click_update_onscreen_config_dump = function(obj, e, args) {
//     $(".stage div.config_dump").empty().append("<table>
//     $(".stage div.config_dump").append("<tr><td><b>");
// }
*/


app.click_display_main_config_login_form = function(obj, e, args) {
    $(".stage").fillup("configuration_login_form");
    // autoclose on click
    $('.sidebar-navbar-collapse a').on("click", function() {$(".sidebar-navbar-collapse").collapse('hide')});
}

app.click_main_config_login = function(obj, e, args) {
    _ajax.username = $(".stage input[name=sa_username]").val();
    app.prepare_token(_ajax.username, $(".stage input[name=sa_password]").val());
    app.click_display_main_config();
}

app.click_continue_from_confirmation = function(obj, e, args) {
    swal({
        title: "Are you sure?",
        text: "This is your last chance to save the crypto key!\n"
            + "Without it all Userify data will be permanently lost."
            + "\n\nONLY PROCEED AFTER YOU HAVE RECORDED\nTHIS DATA OFFLINE (print to PDF)",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "I AGREE",
        closeOnConfirm: true
    }, function(confirmed) {
        if (confirmed) app.click_display_main_config();
    });
}
// (<a href=\"http://ianix.com/pub/curve25519-deployment.html\">extremely strong X25519 encryption</a>).

app.click_display_main_config = function(obj, e, args) {

    if (!_ajax.token) {
        app.click_display_main_config_login_form();
        return
    }

    $(".stage").fillup("configuration_form");

    $(".stage .tls_key").click(function() {
        $(this).prop("rows", "20");
    });

    api.get_server_config_deferred({
        error: function(xhr, if_error, msg) {
            swal("Error " + xhr.status,  xhr.responseJSON.error, "error");
            app.click_display_main_config_login_form();
        }
    })
    .then(function(data) {
        $(".stage").formplode(data);
        $(".stage input[name=web_server_url]").val(location.protocol + "//" + location.host);
        $(".stage input[name=shim_installer_server]").val(location.host);
        $(".stage input[name=shim_configuration_server]").val(location.host);
    });
}

app.click_update_main_config = function(obj, e, args) {

    var configuration = {};
    $(".stage form").formscrape(configuration);
    if (! configuration.mail_server) {
        // swal("Mail Server missing",  "Users cannot be invited without mail configuration and other features won't work. Need a hand? Please contact support@userify.com for prompt help. Continuing as you wish. To reconfigure, please click the Admin Login button in the lower right hand corner of the screen upon installation.", "error");
        // return;
    }
    if (! configuration.web_server_url) {
        console.dir(configuration);
        swal("Error reading form.",  "Formscrape was unable to read the data (or you cleared the required web_server_url). Please try again or notify support@userify.com.", "error");
        return;
    }
    // console.log("KEY:");
    // console.log(configuration.tls_key)
    // console.log("CRT:");
    // console.log(configuration.tls_crt)
    api.update_server_config_deferred(configuration
        // , {"error": function(xhr, if_error, msg) {
        // console.dir(xhr);
        // console.log(xhr.status == 404);
        // var error = xhr.responseJSON.error;
        // swal("Error " + xhr.status,  xhr.responseJSON.error, "error");
        // }}
    )
    .then(function(data) {

        console.log(data);

        if (data.status == "success") {

            swal("Successfully saved configuration.",
                "Please wait; reloading server...",
                "success");
            $(".stage").empty().html("<p style='line-height:100vh; text-align:center; color: #333;'>Reloading in ten seconds...</p>");
            setTimeout(function() {
                // complete reload
                window.location.replace(window.location.pathname +
                    window.location.search);
                location.reload(true);
            }, 10000);

        } else {
            swal("Oops!", "Something didn't go right.", "error");
        }

    });
}


app.click_form_server_logo_upload = function(obj, e, args) {

    /*
    http://stackoverflow.com/questions/12281775/get-data-from-file-input-in-jquery
    http://www.mattlunn.me.uk/blog/2012/05/sending-formdata-with-jquery-ajax/
    http://www.html5rocks.com/en/tutorials/file/xhr2/
    http://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
    */

    $(".stage form.server_logo").stop().fadeOut(500);

    app.show_progress();
    var files = $(".stage input.avatar_upload").prop('files');
    var formData = new FormData($(".stage form.server_logo")[0]);
    // formData.append('secret_token', '12345');

    for (var i = 0, file; file = files[i]; ++i) {
        formData.append(file.name, file);
    }
    //  formData.append('upload', files[0], files[0].name);

    var result = function(data, textStatus, xhr) {

        $(".stage form.server_logo").stop().fadeIn(500);
        app.hide_error();
        app.hide_progress();

        swal("Upload Complete", "New photo uploaded!", "success");
        $("form.server_logo").hide();

        if (xhr.status == 200) {

            // FIXME this only supports image/jpeg at the moment
            // cache_objects("me", {"logo": {"available": true, "mime_type": "image/jpeg"}});
            $(".stage .server_logo span.uploaded_photo").html(app.get_logo());

        } else {
            var error = JSON.parse(xhr.response).error || "Unknown";
            swal("Oops!", error, "error")
        }
    };

    // HTML FormData FileUpload (on jQuery with Userify deferred API)
    // https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
    api.update_server_logo_deferred(
        formData, {
            doNotStringify: true,
            contentType: false,
            processData: false,
            cache: false,
            error: function(xhr, textStatus, errorThrown) {
                    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
                        app.click_view_profile();
                        api.display_error(errormsg);
                    });
            }

    })
    .then(result);


    // var xhr = new XMLHttpRequest();
    // xhr.open('POST', "/api/userify/logo/user_id/" + cache_load("me").id, true);

    // xhr.onload = function(e) {
    //     $(".stage form.server_logo").stop().fadeIn(500);
    //     app.hide_progress();
    //     if (this.status == 200) {

    //         // FIXME this only supports image/jpeg at the moment
    //         cache_objects("me", {"logo": {"available": true, "mime_type": "image/jpeg"}});
    //         app.click_view_profile();

    //         $(".stage .server_logo span.uploaded_photo").html(app.get_logo());
    //         swal("Upload Complete", "New photo uploaded!", "success");

    //     } else {
    //         var error = JSON.parse(this.response).error || "Unknown";
    //         swal("Oops!", error, "error")
    //     }
    // };
    // xhr.send(formData); // multipart/form-data
    return false; // Prevent page from submitting.
}




/* End edition defaults */

;; ///-----------------------------------\\\\


/*
 *
 * Userify Cloud Edition
 * Copyright (c) 2019 Userify Corp.
 *
 */

app.edition = "Baseline"

app.click_server_configuration = function(obj, e, args) {
    app.display_logofied_modal('<h3>Error 500.</h3><p>Something has gone wrong. Please let us know at <a href="mailto:support@userify.com">support@userify.com.</a> Thanks!!</p>');
}

app.prepare_token = function(username, password) {
    _ajax.username = username.toLowerCase().trim();
    // _ajax.token = app.hash256(password, _ajax.username);
    _ajax.token = password;
    return _ajax.token;
}

app.click_test_settings = function(obj, e, args) {
}

app.click_display_main_config_login_form = function(obj, e, args) {
}

app.click_main_config_login = function(obj, e, args) {
}

app.click_continue_from_confirmation = function(obj, e, args) {
}

app.click_display_main_config = function(obj, e, args) {
}

app.click_update_main_config = function(obj, e, args) {
}

/* only GA for cloud */
app.signup_metrics = function(obj, e, args) {

  /*
  $("body").append("<script src='https://www.googleadservices.com/pagead/conversion_async.js'>");

  setTimeout(function() {
      goog_snippet_vars = function() {
        var w = window;
        w.google_conversion_id = 930547415;
        w.google_conversion_label = "_hxhCISdmWUQ143cuwM";
        w.google_remarketing_only = false;
      }
      // DO NOT CHANGE THE CODE BELOW.
      goog_report_conversion = function(url) {
        goog_snippet_vars();
        window.google_conversion_format = "3";
        var opt = new Object();
        opt.onload_callback = function() {
          if (typeof(url) != 'undefined') {
            window.location = url;
          }
        }
        var conv_handler = window['google_trackConversion'];
        if (typeof(conv_handler) == 'function') {
            conv_handler(opt);
        }
      }
      goog_report_conversion();
  }, 100);
  */

  // FB ads pixel only applies to cloud:
  if (app.edition_lower == "cloud") {
    $("body").append('<img src="https://www.facebook.com/tr?id=2418427028409922&ev=PageView" height="1" width="1" style="display:none"/>')
  }

}

;; ///-----------------------------------\\\\


app.intro_msg = function(msgid, title, msg, alert_theme, closeable, expires, menu) {

    msgid = "shown_intro:" + msgid;
    var shown_intro = Cookies.get(msgid) || false;

    // only shown once per msgid
    // if (shown_intro) return;
    if (!DEBUG && shown_intro) return;

    var alert_theme = alert_theme || "success";
    var closeable = closeable !== undefined || true;
    var expires = expires !== undefined || 60;


    $("body").headsup("<h3>" + title + "</h3><p>" + msg + "</p>", alert_theme, closeable, expires);
    Cookies.set(msgid, true);

}

app.simple_headsup = function(title, theme){
    $("body").headsup("<h3>" + title + "</h3>", theme, false, 5);
}

// https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}
function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    app.simple_headsup("Copied to clipboard.", "info");
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
    app.simple_headsup("Copied to clipboard.", "info");
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}

// this replaces api.display_error in userify_q

app.errors = (function(level) {

  var defaults = {
    closeable: true,
    expiration: 20,
    level: "danger"
  }
  var messages = [];

  return {
    defaults: defaults,
    messages: messages,
    wipe: function(filter) {
      $(messages).each(function(i, msg) {
        var msg = $(msg);
        if (!filter || msg.text().startsWith(filter))
          msg.remove();
      });
      // messages.length = 0;
    },
    display: function(msg, level) {
      var last_error = $().headsup(
          "<h3>Server Error</h3><p>" + msg + "</p>",
            level || defaults.level,
            defaults.closeable,
            defaults.expiration);
      messages.push(last_error);
      return last_error;
    }
  }

})();

api.display_error = app.errors.display;

;; ///-----------------------------------\\\\


app.accept_invite = function() {
    api.invitation_details_deferred(app.invite_code)
    .then(function(data) {
        var msg =
            "Congratulations!  "
            + " You have successfully accepted "
            + data.inviter_name
            + "'s invitation to join "
            + data.company_name;
        swal("Invitation", msg);

        api.invitation_acceptance_deferred(app.invite_code)
        .then(function(acceptance_data) {
            app.refresh_companies(function(companies) {
                app.click_company(null, null, {"company_id": data.company_id});
            });
        });

    });
}


app.display_invite = function() {
    api.invitation_details_deferred(app.invite_code)
    .then(function(data) {
        app.invitation_data = data;
        if (_ajax.username && _ajax.token) {
            app.accept_invite();
        } else {
            app.click_display_signup_form();
            // otherwise gets hidden with hidden_signup
            // setTimeout(app.hide_tips, 5000);
            // $(".stage").fillup("signup");
            var msg =
            "Congratulations!  "
                + data.inviter_name
                + " has invited you to join "
                + data.company_name
                + ". Please sign up or log in before accepting the invitation."
            swal("Invitation", msg);
        }
    });



}


;; ///-----------------------------------\\\\



// userify-jquery-plugins begin

$.fn.myqtip = function(msg, bgcolor) {
  $(this)
    .qtip({
      position: {"my": "bottom left", "at": "center center"},
      style: {classes: 'blue'}, //'qtip-rounded'},
      content: {text: msg}
    })
    .css("background", bgcolor || "#ffeeee")
  ;
  return this;
}

$.fn.prepform = function(data) {
  $(this)
    .formplode(data || {})
    .find('input[type=text],textarea,select:enabled:visible')
    .filter(":first")
    .focus();
  return this;
}

$.prepform = function(data) {
  $(".stage form").prepform(data);
  return this;
}


// nice method to add a dropdown menu (old bootstrap)
// $.fn.add_dropdown = function(label, labelclasses, choices, caret, floatright) {
//   var menu = $('<div class="dropdown"><a href="#" class="' +
//     (emptify(labelclasses) ? labelclasses : 'btn') +
//     '" type="a" data-toggle="dropdown">' + label +
//     (emptify(caret) ? '<span class="caret"></span>' : '') +
//     '</a><ul class="dropdown-menu ' +
//     (emptify(floatright) ? ' dropdown-menu-right' : '') +
//     '" role="menu"></ul></div>');
//   $(this).append(menu);
//   var menudest = $("ul", this);
//   menu.append(menudest);
//   $.each(choices, function(idx, data) {
//     var my_choice = $('<li role="presentation"></li>');
//     menudest.append(my_choice);
//     if (data["divider"] || false) {
//       my_choice.addClass("divider");
//     } else {
//       my_choice.attr("data-ah-action", data["action"]);
//       my_choice.attr("data-value", data["value"]);
//       my_choice.append('<a role="menuitem" tabindex="-1" href="#">' + data["label"] + '</a>');
//     }
//   });
//   return this;
// }

// create null console methods if object does not exist
// http://stackoverflow.com/questions/3326650/console-is-undefined-error-for-internet-explorer/16916941#16916941
(function() {
  var method;
  var noop = function () {};
  var methods = [
    'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
    'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
    'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
    'timeStamp', 'trace', 'warn'
  ];
  var length = methods.length;
  var console = (window.console = window.console || {});

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
  dir = console.dir;
  log = console.log;
}());

$.fn.update_company_list = function() {
  var temp = $(this);
  $("li.company-listing", this).remove();
  var companies = _.keys(app.companies);
  companies.sort();
  companies.reverse();
  $.each(companies, function(idx, this_subdomain) {
    company = app.companies[this_subdomain];
    var li = "<li class='company-listing'><a href='#' data-ah-action='switch_company' company='" +
      this_subdomain + "'>Company: " + this_subdomain;
    if (app.current_subdomain && this_subdomain == app.current_subdomain)
      li += "&nbsp;<span class='glyphicon glyphicon-ok'></span>";
    li += "</a></li>";
    temp.prepend(li);
  });
  return this;
}

app.get_logo = function(user) {

  if (!user)
    var user = cache_load("me");

  if (user.logo && user.logo.available) {

    if (false) { // user.id == me.id && user.logo.available) {
      // attach a timestamp to my own photo so that it's not cached
      var d = new Date();
      return "<div class=user_logo_wrapper><img class=user_logo src='/api/userify/logo/object_id/" + user.id + "?" + d.getTime() + "'></div>";

    } else {

      return "<div class=user_logo_wrapper><img class=user_logo src='/api/userify/logo/object_id/" + user.id + "'></div>";

    }

  } else {

    var email = "";
    var val = "";
    if (user.email && user.email.length > 0) {
      email = user.email;
    } else {
      email = "";
    }

    if (email != "") {
      val = ("<div class=user_logo_wrapper>" +
        app.gravatar(email, 48)
          + "</div>");
    } else {
      var two = user.name.slice(0,2);
      if (two === "") two = user.username.slice(0,2);
      val = ("<div class=user_logo_wrapper><div class=user_logo><h1 class='user_color user_color" +
        + get_color(two.slice(0,1)) + "'>"
          + two
          // + "Ww"
          + "</h1></div></div>");
      // $("h1",obj).css("font-size", obj.width() * .50);
      // return obj;
    }
    return val;

  }
}

app.gravatar = function(email, size){
  var email = email || "";
  if (email != "" && email.indexOf("+") != -1) {
     email = email.split("+")[0] + "@" + email.split("@")[1];
  }
  return ('<img class=user_logo src="https://secure.gravatar.com/avatar/' +
    md5(email.trim().toLowerCase()) + '?s=' + size + '&d=mm">');
}


$.fn.gravatar = function(email, size){
  var self = $(this);
  return self.html(app.gravatar(email, size));
}


$.fn.waitanimate = function(begin) {
  var self = $(this);
  if (begin) {
    self.prop("disabled", true)
      .fadeTo(100,.5)
      .animate({
        left: "+=20px"
      }, 100)
    ;
  } else {
    self.delay(70)
      .animate({
        left: "-=20px"
      }, 100)
      .fadeTo(300,1)
      .prop("disabled", false)
    ;
  }
  return self
}


/* append a list of option items to a select menu */
$.fn.select_menu = function(items) {
  var menu = $(this);
  menu.empty();
  $.each(items, function(idx, val) {
    var option = $("<option>")
      .val(val)
      .html(val.replace("_", " ").toUpperCase());
    menu.append(option);
  });
  menu.first().prop("selected", true);
  return menu
}

$.fn.highlight = function() {
  var self = $(this);
  self.addClass("highlight");
  setTimeout(function() {
    self.removeClass("highlight");
  }, 3000);
  return self;
}

// userify-jquery-plugins end

$.fn.disable = function() { return $(this).prop("disable", true); }
$.fn.enable = function() { return $(this).prop("enable", true); }



;; ///-----------------------------------\\\\


// kickoff main
// $(document).on('ready page:load', function () { $(app.main); });

;; ///-----------------------------------\\\\


app.load_profile = function(me) {
  $(".stage .login_form").remove();
  cache_object("me", me);
  $(".stage").fillup("mainpage");
  app.update_server_license_count();
  app.set_edition_theme();

  $("html").addClass(app.edition);
  // TODO user-changeable themes
  // if (me.userify_theme) {
  //   app.change_theme(me.userify_theme);
  // }
  app.refresh_companies(function(companies) {
    company_id = Cookies.get(_ajax.username + ":last_company");
    project_id = Cookies.get(_ajax.username + ":last_project");
    if (debug_function) {
      debug_function();
      return;
    }
    if (company_id)
      var company = app.get_company_by_id(cache_load("companies"), company_id);
    if (company_id && project_id)
      var project = app.get_project_by_id(company, project_id);

    if (company && project) {
      app.change_project(company_id, project.id);
      return;

    } else if (company) {
      app.click_company(null,null, {"company_id": company_id});
      return;
    }

    app.click_view_profile();
    return;
  });
}

app.login = function() {

  _ajax.username = $(".stage form.login_form input[name=username]").val() || _ajax.username;

  api.get_my_profile_deferred(
  {error: function(xhr, textStatus, errorThrown) {
    app.show_progress();
    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {

      // always remove MFA token on failed login
      Cookies.remove("mfa-shared-token");
      app.click_display_login_form();
      app.hide_progress();

      if (xhr.status === 412) {
        console.log("Error 412: " + errormsg);
        // NOT silent failure
        app.forget_login(false);
        app.click_display_login_form();
        api.display_error(errormsg);
        return;
      }

      if (xhr.status === 420) {
        app.hide_error();
        swal({
          title: "Protected MFA Login",
          text: "Please provide your MFA six-digit code OR your backup code (not case or whitespace sensitive).",
          type: "input",
          showCancelButton: true,
          closeOnConfirm: false,
          animation: "slide-from-top",
          inputPlaceholder: "000000"
        },
        function (mfacode) {

          if (mfacode === false || mfacode === "") {
            swal.showInputError("Please open the MFA application (FreeOTP) and enter the six-digit code.");
            return false
          }

          //try again
          api.get_browser_enablement_code_deferred(mfacode)
          .then(function(data) {
            if (data.mfa_acceptance) {
              Cookies.set(
                "mfa-shared-token",
                data.mfa_acceptance, {"expires": 3},
                app.cookie_settings);
            } else {
              Cookies.remove("mfa-shared-token");
            }
            swal.close();
            app.login();
          });
        });
      } else {
        // in case old login details..
        app.forget_login(false);
        app.click_display_login_form();
        api.display_error(errormsg);
      }
    });
  }})
  .then(function(me) {
    app.hide_error();

    if (me.disabled) {
      swal({
        title: "Your account was disabled.",
        text: "Unfortunately your account has been temporarily disabled or locked"
          + " out by the LDAP/AD server. You can still manage your Userify account"
          + " but you have been temporarily removed from all servers.",
        type: "error",
        showCancelButton: false,
        closeOnConfirm: true,
        animation: "slide-from-top"
      });
    }

    if (app.invite_code) {
      app.accept_invite();
    }

    app.load_profile(me);

    // if (app.edition == "Cloud")
    //     app.intro_msg("setup-cc-2", "Heads-up!",
    //       "REMEMBER to update your credit card by Feb 28th to keep your account active.");

    if (! me.mfa.enabled) {
      app.intro_msg("setup-mfa", "Important: Secure your login",
        "Set up <a href='#' data-ah-action=setup_mfa>MFA</a> for extra security.");
    }
    app.errors.wipe("Server Error");

  });
}

app.click_display_signup_form = function(obj, e, args) {
  setTimeout(app.hide_tips, 5000);
  if (server_status.ldap_configured)  {
    // LDAP always just does a normal login.
    // no signup needed.
    app.click_display_login_form();
    return;
  } else {
    $(".stage").fillup("signup_form");
    // prevent bad characters in usernames.
    // we also whitelist on the server side, but the server
    // allows @ and . if you prefer.
    $(".stage input[name=username]").accept_only_lowercase_numbers_and_underscore();
  }
  app.update_server_license_count();
  // if ((!app.invitation_data) && (!app.invitation_data.company_name) ) {
  var d = $("<div>");
  d.fillup("news");
  $(".release-version").html(app.name + " " + " " + app.edition + " " + app.version);
  $(".stage .signup_features").append(d);
}

app.click_display_login_form = function(obj, e, args) {
  $(".stage").fillup("login_form");
  app.update_server_license_count();
  setTimeout(app.hide_tips, 5000);
  /*
  if (app.edition_lower != "cloud") {
    if (!(server_status.hidden_signup) && !app.invite_code) {
      // display signup for for the first time only
      // (or if invite code)
      // if ( ! server_status.ldap_configured)
      //   app.click_display_signup_form(obj, e, args);
    }

  }
  */
  // $(".stage input[name=username]")
  //   .prop("value", "admin")
  //   .qtip({
  //     content: {
  //       title: "Welcome Administrator!",
  //       text: "Please create your administrative account here.<br>"
  //         + "This account is <b>different</b> from the server admin account "
  //         + "that you just created."
  //   });
  var d = $("<div>");
  d.fillup("news");
  $(".release-version").html(app.name + " " + " " + app.edition + " " + app.version);
  $(".stage .login_wrapper").append(d);
  if (_ajax.username) {
    $(".stage form.login_form input[name='username']").val(_ajax.username);
    $(".stage form.login_form input[name='password']").focus();
  }
  else {
    $(".stage form.login_form input[name='username']").focus();
  }
}

app.remember_login = function() {
  Cookies.set("token", _ajax.token, {"expires": 14}, app.cookie_settings);
  Cookies.set("username", _ajax.username, app.cookie_settings);
}

app.click_login = function(obj, e, args) {
  // Load login
  _ajax.username = $(".stage form.login_form input[name=username]").val();
  app.rememberme = $(".stage form.login_form input[name=rememberme]").prop("checked");
  app.prepare_token(_ajax.username, $(".stage form.login_form input[name=password]").val());
  if (0 && app.rememberme) app.remember_login();
  else Cookies.set("username", _ajax.username, app.cookie_settings);

  // Load mainpage
  app.login();

}

/* new user signup! */

app.signup_user = function(profile) {

  if (profile.email.length < 4) {
    if (app.edition_lower == "cloud" || !server_status.ldap_configured) {
      swal("Oops!",
        "Please provide an email of at least four characters.",
        "error");
      return;
    }
  }
  if (profile.username.length < 1) {
    swal("Oops!",
      "Please provide a username of at least one character.",
      "error");
    return;
  }
  if (profile.password.length < 8) {
    swal("Oops!",
      "Please ensure your password is at least eight characters.",
      "error");
    return;
  }

  // if (app.edition_lower == "cloud") {
  //   if (profile.email.toLowerCase().endsWith("mail.com") ||
  //     profile.email.toLowerCase().endsWith("yahoo.com") ||
  //     profile.email.toLowerCase().endsWith("yahoo.co.uk") ||
  //     profile.email.toLowerCase().endsWith("yandex.com") ||
  //     profile.email.toLowerCase().endsWith("aol.com") ||
  //     profile.email.toLowerCase().endsWith("mail.ru")
  //     ) {
  //     swal("Oops!", "Please use your work email address.", "info");
  //     return;
  //   }
  // }

  _ajax.username = profile.username;
  app.prepare_token(_ajax.username, profile.password);
  profile.password = _ajax.token;
  // progress bar (gets wiped after login)
  app.show_progress();
  Pace.options = {ajax:true}
  Pace.start();
  Pace.restart();
  api.create_user_deferred(profile, {
  error: function(xhr, textStatus, errorThrown) {
    app.hide_progress();
    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
      api.display_error(errormsg);
    });
  }})
  .then(function() {

    app.login();

    if (app.edition_lower == "cloud")
      var text = "Get started by creating a company and adding some servers.";
    else
      var text = "Get started by generating an SSH key (this is easy!) and setting your photo.";

    swal({
      title: "Welcome to Userify!",
      text: text,
      type: "success",
      showCancelButton: false,
      closeOnConfirm: true,
      animation: "slide-from-top"
    });

    app.signup_metrics();

  });
  profile.password = "";
}

app.click_signup = function(obj, evt, args) {
  if (evt) evt.preventDefault();
  var profile = formscrape(".stage .signup_form");
  if (!profile.email) profile.email = '';
  if (!profile.username) profile.username = '';
  if (!profile.password) profile.password = '';
  if (profile.username.includes(".") ||
    profile.username.includes("-") ||
    profile.username.includes("@") ) {
      swal({
          title: "Possibly incompatible characters used.",
          text: "Although ., @, and _ are part of the POSIX standard, "
            + " many Linux distributions do not permit them in either usernames"
            + " or sudo configurations because of potential issues"
            + " in shell scripting. We recommend you do not use these"
            + " characters for maximum compatibility.",
          type: "warning",
          showCancelButton: true,
          confirmButtonColor: "#BB1B1B",
          confirmButtonText: "I'm OK with that."
      }, function(isConfirm) { if(isConfirm) app.signup_user(profile); });
  } else { app.signup_user(profile); }
  return false;
}

/*
background.add_edit_button = function() {
  $(".stage .editable")
    .find("span.xeditable-pencil").remove()
    .append(
    '<span class="label label-success xeditable-pencil">EDIT<i class="xfa xfa-pencil-square-o"></i></span>');
}
*/

/*
background.update_full_name = function() {
  // TODO FIXME
  return;
  if (app.full_name)
    $(".app_full_name").safify(app.full_name);
}
*/


background.check_hash = function() {

  var hash = new Tanchor(location);

  if (hash.getHashVars().reset_code && hash.getHashVars().username) {
    var reset_code = hash.getHashVars().reset_code;
    app.forget_login(false);
    _ajax.username = hash.getHashVars().username;
    hash.delHashVar("reset_code");
    location.hash = "";
    // fragments.del();
    app.click_reset_password_with_code(null,null,{"reset_code": reset_code});
  }

  if (hash.getHashVars().invite_code) {
    app.invite_code = hash.getHashVars().invite_code;
    // location.hash = "";
    location.hash = "";
    // doesn't work:
    // hash.href();
    hash.delHashVar("invite_code");
    app.display_invite(app.invite_code);
  }

}

app.display_logofied_modal = function(msg) {
  $(".stage").html('<div class="modal_panel logofied">' + msg + '</div>');
}
app.display_modal = function(msg) {
  $(".stage").html('<div class="modal_panel">' + msg + '</div>');
}

// update bootstrapWizard every time page updates (via flip)
// page_updates.rootwizard = function() {$('.stage .rootwizard').bootstrapWizard()}


app.theme_hax0r = function() {
  // darkness...
  $(".theme").removeClass("theme-default");
  $(".theme").removeClass("theme-day");
  $(".theme").removeClass("theme-dark");
  $("body").addClass("theme-hax0r");
  app.qtip_theme = "qtip-youtube";
}

app.display_tooltips = function() {
  // tooltip setup
  var qtip_settings = {
    show: "hover",
    hide: "click",
    events: {
      hide: function(event, api) {
        app.hide_tips();
      }
    },
    style: {
      classes: "qtip-bootstrap qtip-rounded qtip-shadow"
    },
    position: {
      adjust: { method: "none shift" },
      viewport: $(window),
      my: "top right",   // position of the arrow
      at: "bottom right" // where pointing at the button
    }
  }
  $(".stage [tooltip]").qtip(qtip_settings);
  // qtip_settings2 = JSON.parse(JSON.stringify(qtip_settings));
  // qtip_settings2.content = {attr: 'data-tooltip'}
  // qtip_settings2.events.show = "hover";
  // qtip_settings2.events.hide = "blur";
  // $(".stage [data-tooltip!='']").qtip(qtip_settings);
}

app.reload_profile_deferred = function(fn) {
  api.get_my_profile_deferred({
    error: function(xhr, textStatus, errorThrown) {}
  })
  .then(function(me) {
    app.hide_error();
    app.load_profile(me);
    if(fn) fn();
  });
}



;; ///-----------------------------------\\\\


app.pre_main = function() {

  // test_headsup();

  // start action handler on items of interest
  // $(".stage").on("hover click focusout change dblclick focus keydown keypress keyup mousedown mousemove mouseout mouseover mouseup resize scroll select submit", "[data-ah-action]", ".stage", action_handler);
  // this has to be over entire body because of qtips :(
  // $("body").on("click", "[data-ah-flip]", flip_it_up);
  $("body").on("mouseover click change submit mouseout", "[data-ah-action]", ".stage", action_handler);
  // $("body").on("hover click focusout change dblclick focus keydown keypress keyup mousemove mouseout mouseover mouseup resize scroll submit", "[data-ah-action]", ".stage", action_handler);
  $("body").on("click submit", "[data-ah-flip]", flip_handler);


  app.set_edition();

  // select code on click
  // $(".qtip-content>textarea>pre>code").on("focus", function(){$(this).select();});

  // Pre-cache
  // Precaches server-side assets for user as soon as
  // username is entered.
  $(".stage .login_wrapper .precache_username_field").on("blur", function() {
  var login = formscrape(".stage form.login_form");
  if (login.username)
    api.pre_cache_deferred("IGNORE" + login.username,
    {
       // ignore any pre-cache error
       error: function(xhr, textStatus, errorThrown) {}
    }
    );
  });

  // Set X-editable to inline editing mode.
  $.fn = $.fn || {};
  $.fn.editable = $.fn.editable || {};
  $.fn.editable.defaults = $.fn.editable.defaults || {};
  $.fn.editable.defaults.mode = 'inline';

  // fix up page..
  _ajax.username = Cookies.get("username") || "";
  _ajax.token = Cookies.get("token") || "";

  /*
   * check server status
   * if this does not complete in a reasonable amount
   * of time (1.5s), reload
   */
  (function() {

  if (DEBUG) {
    $("body").append("<div style='position: fixed; bottom: 4px; left: 4px; color: white; background: red; margin: 0; padding: 5px 16px; border-radius: 4px; text-align: right; font-weight: bold'>"
    + "<i style='color: yellow' class='fa fa-warning'></i> "
    + "DEBUG MODE"
    + "</div>"
    );
  }

  // hide url bar on mobile
  window.scrollTo(0,1);

  app.status_timeout = true;
  })();
}

app.main = function() {
  app.pre_main();
  (function() {
    setTimeout(function() {

      if (app.status_timeout) {
      var msg = "<div style='padding: 5rem; background: rgba(255,255,255,0.3);'><h2>Error: server status should have loaded by now.</h2>";
      if (app.edition == "Cloud") {
        $(".stage").html(msg +
        "<p>Trying again shortly..</p>" +
        "<p>Please email <a href=mailto:support@userify.com>support@userify.com</a>" +
        " if this loops.</div>");
      } else {
        $(".stage").html(msg +
        "<p>Trying again shortly..</p>" +
        "<p>Your server seems to be offline and is probably restarting. If this occurs for an extended period, it is usually due to an automatic upgrade where the automatic restart script (userify-start) has not been configured." +
        "<p>Please contact <a href=mailto:support@userify.com>support@userify.com</a> with any questions.</div>");
      }
      setTimeout(function() {
        if (app.status_timeout)
        // alert("Reloading... status timeout.");
        setTimeout(function() {
          location.reload(true);
        }, 6000);
      }, 4000);
      } else {
      app.status_timeout = false;
      }
    }, 7000);
    // display login form
    app.click_display_login_form();
    // wait for status:
    api.status_deferred()
    .then(app.status_login);
  })();
}

;; ///-----------------------------------\\\\



// userify-menus begin

background.update_my_name = function() {
    // remove website menu from ipad-size screens
    $("#header-11").remove();
    if (!window.cache) return;
    if (!cache.me) return;
    $(".edition-titlebar")
        .do_not_safify(cache.me.name || "Your Profile")
        // .append("&nbsp;<i class='fa fa-chevron-down'></i>");
}

app.click_display_left_menu = function() {
    $(".qtip").remove();
    // app.click_unexpand_top_menu();
    $(".stage .mainapp-wrapper").addClass("hidden-xs");
    $(".stage .left_menu_wrapper").removeClass("hidden-xs");
    // $(".stage .mainapp-wrapper").addClass("hidden-sm");
    // $(".stage .left_menu_wrapper").removeClass("hidden-sm");

    // $(".stage .right_menu_wrapper").addClass("hidden-xs");
}

app.click_display_mainapp = function() {

    // activate main application window view (esp on mobile)

    // app.click_unexpand_top_menu();
    $(".stage .left_menu_wrapper").addClass("hidden-xs");
    $(".stage .mainapp-wrapper").removeClass("hidden-xs");
    // $(".stage .left_menu_wrapper").addClass("hidden-sm");
    // $(".stage .mainapp-wrapper").removeClass("hidden-sm");

    // display edition-specific features.
    app.show_edition_features();
    // $(".stage .right_menu_wrapper").addClass("hidden-xs");

    if (cache && cache.me && cache.me.name) {
        $(".stage .myname").do_not_safify(cache.me.name);
    }

}

// app.hide_right_menu = function() {
//     $(".stage .right_menu_wrapper").fadeOut(700);
// }
// app.show_right_menu = function() {
//     $(".stage .right_menu_wrapper").fadeIn(700);
// }

app.click_display_right_menu = function() {
    // app.click_unexpand_top_menu();
    $(".stage .mainapp-wrapper").addClass("hidden-xs");
    $(".stage .left_menu_wrapper").addClass("hidden-xs");
    // $(".stage .mainapp-wrapper").addClass("hidden-sm");
    // $(".stage .left_menu_wrapper").addClass("hidden-sm");

    // $(".stage .right_menu_wrapper").removeClass("hidden-xs");
}

var shim_general = "<h2>The Userify Shim</h2><p>The Userify shim creates users, manages sudo permissions, etc based on the user accounts that you've configured in the Userify web console (that's this) or through the API.</p><p>Please note: the API user ID and key in this script is unique to this project server group.</p>"
var help = {
    "shim": {
        "bash": shim_general + "<h2>The bash installer</h2><p>The bash installer is a one-line installation script that can be run on any server with HTTPS access to the Internet that will automatically configure it to begin creating user accounts from Userify.</p><p>Simply copy and paste it into the server and it will begin running immediately.</p>",
        "chef": shim_general + "<h2>Basic Chef Recipe</h2><p>This user-contributed chef recipe will kick off the Userify installation script for the shim and configure the shim for the target server.</p>",
        "cloudinit": shim_general + "<h2>Installing with CloudInit</h2><p>Paste this into the User Data portion of your cloud console at AWS, Rackspace, or Digital Ocean, or a CloudFormation userdata script, and this script will kick off the Userify installation script for the shim and configure the shim for the target server.</p>",
        "creds": shim_general + "<h2>Creds.py</h2><p>This is the raw creds.py data that is created in /opt/userify/creds.py.</p>"
    }
}

app.click_help = function(obj, e, args) {
    args = args.split(",");
    var this_help = help[args[0]][args[1]];
    if (this_help)
        $(".stage .project_matrix").qtip({
            content: {
                title: {
                    text: toTitleCase(args[0]) + ": " + toTitleCase(args[1]) + " Help",
                    button: 'close'
                },
                text: this_help,
            },
            show: {solo: false, ready: true, modal: true},
            hide: 'click',
            events: {
                hide: function(event, api) {
                    app.hide_tips();
                }
            },
            style: {
                classes: app.qtip_theme + " help_qtip",
            },
            position: {
                my: "center center",   // position of the arrow
                at: "center center" // where pointing at the button
            }
        });
    else
        swal({
            title: "Help Topic Not Found",
            text: "Sorry, help topic " + args[0] + "," + args[1] + " not found. :(",
            type: "warning"});
}

app.initialize_left_menu = function() {
    // app.click_unexpand_top_menu();
    app.display_project_menu(".stage .left_menu", cache_load("companies"));
}

app.hide_tips = function() {
    $(".qtip").remove();
    $("#qtip-overlay").hide();
}
app.click_hide_tips = app.hide_tips;

app.hide_progress = function() {
    // try thrice..
    $(".stage button").attr("disabled", false);
    $(".progress", ".stage").stop().fadeOut(200);
    setTimeout(function(){$(".progress", ".stage").stop().fadeOut(200).addClass("hidden")}, 300);
    setTimeout(function(){$(".progress", ".stage").stop().fadeOut(200).addClass("hidden")}, 700);
}

app.show_progress = function() {
    // make minor slowdowns disappear..
    // console.log($(".stage .progress"));
    // setTimeout(function(){$(".progress", ".stage").stop().removeClass("hidden").fadeIn(200)}, 400);
    //
    // switched to PACE..
    // $(".stage .progress").stop().removeClass("hidden").fadeIn(200);
    $(".stage button").attr("disabled", true);
    //
    setTimeout(app.hide_progress, 5000);
}

app.refresh_companies = function(callback) {

    var callback = callback || function(){};
    api.get_my_companies_deferred()
    .then(function(companies) {
        app.hide_error();
        app.hide_progress();
        delete cache.companies;
        cache_list("companies", companies.companies);
        app.initialize_left_menu();

    if (companies.companies) {
        $.each(companies.companies, function(company_id, company) {
            if (company.user_messages) {
                $.each(company.user_messages, function(idx, message) {
                    app.intro_msg(
                        message.id,
                        message.title,
                        message.html,
                        message.alert_theme,
                        message.closeable,
                        message.expires,
                        message.menu
                    );
                });
            }
        });
    }

    if (_.keys(cache.companies).length == 0) {
        if (server_status.hidden_add_company == false) {
            $(".stage .add_company_button")
                .removeClass("btn-default")
                .addClass("btn-success")
                .delay(200)
                .removeClass("btn-success")
                .addClass("btn-default")
                .delay(200)
                .removeClass("btn-default")
                .addClass("btn-success")
                .delay(200)
                .removeClass("btn-success")
                .addClass("btn-default");
            app.intro_msg(
                "no_companies",
                "Create your first Company!",
                "Companies have projects and server groups."
                + " To get started, click Add Company."
            );
        }
    }

        /* if (!app.showed_license_warning) {
               $.each(companies.companies, function(idx, company) {
                   if (company.license && company.license.exceeded_date) {
                       swal({
                           title: "Heads-up",
                           text: "Company " + company.name + " has exceeded "
                           + company.license.max_licensed
                           + " server licenses. "
                           + "Please update billing details or lower server count and "
                           + " help us keep making awesome software. Thanks!!",
                           type: "warning"});
                       app.showed_license_warning = true;
                   }
               });
           }
        */

        callback(companies);
    });
}

app.click_refresh_companies = function(obj, evt, args) {
    app.show_progress();
    app.refresh_companies(app.hide_progress);
}


app.click_toggle_pane = function(obj, evt, args) {
  var followup=$(obj).attr("data-toggle-followup")
  var source=$(obj).attr("data-toggle-source")
  var pane=$(obj).attr("data-toggle-pane")
  $("[data-toggle-pane='" + pane + "']", ".stage").removeClass("active");
  $(obj).addClass("active");
  $(".stage ." + pane).removeClass("hidden");
  $(".stage ." + pane).removeClass("active").hide();
  $(".stage ." + source).addClass("active").show();
  if (app && app[followup]) {
    app[followup]($(".stage ." + source), evt, args);
    console.log(followup);
  } else {
    console.log(followup + "not found");
  }
}

// app.click_unexpand_top_menu = function() {
//     $(".stage nav.top-bar.expanded").removeClass("expanded");
// }

// userify-menus end



;; ///-----------------------------------\\\\


app.click_update_perms = function(obj, e, args) {

    // THIS DOESN'T SEEM TO RELIABLY WORK ON QTIP2... obj perhaps doesn't exist
    // when this is run?

    var company_id = args.company_id;
    var project_id = (args.project_id) ? args.project_id : '';
    var company = app.get_company_by_id(cache_load('companies'), company_id);
    console.log("click_update_perms");
    console.log(obj);
    var obj = obj || ".stage";

    // hide all
    console.log(obj);
    $('[data-permission-required]', obj).hide();
    _.each(company.my_permissions, function(perm) {
        console.log(perm);
        $('[data-permission-required="' + perm + '"]', obj).show();
    });
}


;; ///-----------------------------------\\\\



// userify-profile begin

$.fn.user_menu = function(){

    var self = $(this);
    $(".stage .right_menu").fillup("user_menu");
    return self;

}

app.initialize_right_menu = function() {
  return
  // unused
  // $(".stage .right_menu").fillup("user_menu").user_menu();
}

app.click_view_profile = function() {

    // app.click_unexpand_top_menu();
    app.initialize_right_menu();
    app.click_display_right_menu();
    app.click_display_mainapp();
    app.hide_tips();
    app.hide_progress();
    scroll_top();

    Cookies.remove(_ajax.username + ":last_company", app.cookie_settings);
    Cookies.remove(_ajax.username + ":last_project", app.cookie_settings);

    var me = cache_load("me");
    $(".stage .mainapp").empty().fillup("profile");
    // also running on form.profile :(
    // $(".stage .user_menu").formplode(me);
    $(".stage form.profile").formplode(me);

    if (me.ssh_private_key_status == "enabled") {
      $(".stage .ssh_private_key_status")
        .html("Private Key Enabled. <span class='link text-danger'"
          +" data-ah-action=delete_ssh_private_key>Disable</link>");
    }

    if (app.edition == "Cloud" && (!me.companies || me.companies.length == 0)) {
         app.intro_msg(
            "setup-create_company",
            "Create your company",
            "Next up: click the green plus on the left hand side to create your company and projects.");
    }

    // $(".stage form.profile .github_username").val(me.username);
    if (me.email) {
        var my_email = me.email;
        $(".stage form.profile [name='email']").empty().val(my_email);
        // $(".stage .user_menu [name='email']").val(my_email);
        $(".stage .myavatar").html(app.get_logo());
    }
    $(".stage form.profile [name='name']").focus();
    if (!("FormData" in window)) {
        // FormData is not supported; degrade gracefully/ alert the user as appropiate
        $(".file_upload_panel").html(
            "Unfortunately, your browser may be too old to support photo uploading (HTML5 FormData).");
    }

}

app.click_setup_mfa = function(obj, e, args) {

    // app.click_unexpand_top_menu();
    app.initialize_right_menu();
    app.click_display_right_menu();
    app.click_display_mainapp();
    app.hide_tips();
    app.hide_progress();
    scroll_top();

    Cookies.remove(_ajax.username + ":last_company", app.cookie_settings);
    Cookies.remove(_ajax.username + ":last_project", app.cookie_settings);

    $(".stage .mainapp").empty().fillup("mfa");
    $(".stage input").focus();
    $(".stage form.mfa-initial").click(app.click_enable_totp);

    app.show_progress();
    api.get_totp_qr_code_deferred()
    .then(function(data) {
        var img = "data:image/png;base64," + data.qrcode;
        $(".stage .backup-code").empty().html(data.backup);
        $(".stage .mfa-qrcode").empty().append('<img src="'
            + img + '">');
        app.hide_progress();
    });

}


app.click_disable_totp = function(obj, e, args) {
    e.preventDefault();
    app.show_progress();
    swal({
        customClass: "wide-sweetalert",
        title: "Disable MFA",
        text: "Are you Sure? This revokes all existing devices.",
        html: true,
        closeOnConfirm: false,
        showCancelButton: true,
        allowOutsideClick: true,
        type: "warning"
    }, function() {
        api.disable_totp_mfa_deferred()
        .then(function(data) {
            if (data.status == "success") {
                swal({
                    customClass: "wide-sweetalert",
                    title: "Finished!",
                    text: "You have successfully disabled 2FA/MFA. This revokes all existing devices.",
                    html: true,
                    closeOnConfirm: true,
                    showCancelButton: false,
                    allowOutsideClick: true,
                    type: "success"
                }, function() { app.click_view_profile(); }
                );
                // app.click_display_profile();
            } else {
                swal({
                    customClass: "wide-sweetalert",
                    title: "Sorry.",
                    text: "Something went wrong disabling MFA; please try again or email support@userify.com.",
                    closeOnConfirm: true,
                    showCancelButton: false,
                    allowOutsideClick: true,
                    type: "warning"
                });
            }
            app.hide_progress();
            Cookies.remove("mfa-shared-token");
        });
    });

    return false;
}

app.click_enable_totp = function(obj, e, args) {

    var code = $(".stage .totp-token").val();
    e.preventDefault();
    if (!code || code == "") return;

    app.show_progress();

    api.enable_totp_mfa_deferred(code)
    .then(function(data) {

        app.hide_progress();
        if (data.status == "success") {
            swal({
                customClass: "wide-sweetalert",
                title: "Great job!",
                text: "You have successfully enabled 2FA. Whenever you log in at a new browser or device,"
                 +" you will be prompted for a code from this application.",
                html: true,
                closeOnConfirm: true,
                allowOutsideClick: true,
                type: "success"
            }, function() { app.forget_login(true) }
            );
            // app.click_display_profile();
        } else {
            swal({
                customClass: "wide-sweetalert",
                title: "Sorry.",
                text: "Something went wrong confirming your code; please try again.",
                closeOnConfirm: true,
                showCancelButton: false,
                allowOutsideClick: true,
                type: "warning"
            });
        }
    });

    return false;
}

app.click_download_keypair = function(obj, e, args) {
  api.get_keypair_deferred()
	.then(function(data) {

			app.hide_error();

		  var linkarea = $(".stage .keypair-links").empty().hide().show(900);
      linkarea.append("<h4>Download your new Private Key</h4>");

			if (data && data.key !== "") {

        var keylink = $(
        "<i class='text-success fa fas fa-download'></i> &nbsp;"
          + "<span class='link'>Linux, Mac: Download Private Key</span><br>");
        keylink.click(function(){
					download("id_rsa", data.ssh_private_key);
          cache_load("me").ssh_private_key_status = "enabled";
          $(".stage .ssh_private_key_status")
            .html("Private Key Enabled. <span class='link text-danger'"
              +" data-ah-action=delete_ssh_private_key>Disable</link>");
				});
			  linkarea.append(keylink)
        linkarea.append("<p>Linux and Mac: don't forget to <code>chmod 600 id_rsa</code> and then use the key"
          + " like this: <pre>ssh -i id_rsa myserver</pre></p>");

        var ppklink = $("<i class='text-success fa fas fa-download'></i> &nbsp;"
          + "<span class='link'>Windows: Download Putty Private Key (PPK)</span>");
        ppklink.click(function(){
					download("userify.ppk", data.putty_ppk);
				});
			  linkarea.append(ppklink)

        linkarea.append("<br><br><h4>Using your new private key is easy!</h4><p>");
        linkarea.append("<ol><li>Download the private key appropriate"
        +" for your system above."
        +"<li><b>Don't forget to <em>Click Save</em></b>"
        +" to update your public key."
        +"<p>Please allow up to three minutes for key changes to be"
        +" distributed across all servers.</p>"
        +"</ol></p><p>To abort updating your public key(s), press Cancel. You can also Disable your new private key below.</p>")

        // update the public keybox
        $(".stage textarea[name=ssh_public_key]").val(data.public_key);
        swal("Completed!", "Please download your new key and be sure to click Save.")
			} else {
        swal("Unable to generate new key", "The server may not be configured"
          +" with ssh and putty-tools to allow generating keys."
          +" Please contact your administrator.", "error")
      }
	});
}

app.click_form_profile_ssh_private_key_upload = function(obj, e, args) {
    /*
    http://stackoverflow.com/questions/12281775/get-data-from-file-input-in-jquery
    http://www.mattlunn.me.uk/blog/2012/05/sending-formdata-with-jquery-ajax/
    http://www.html5rocks.com/en/tutorials/file/xhr2/
    http://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
    */
    $(".stage form.profile_ssh_private_key").stop().fadeOut(500);
    app.show_progress();
    var files = $(".stage input.avatar_upload").prop('files');
    var formData = new FormData($(".stage form.profile_ssh_private_key")[0]);
    // formData.append('secret_token', '12345');
    for (var i = 0, file; file = files[i]; ++i) {
        formData.append(file.name, file);
    }
    // HTML FormData FileUpload (on jQuery with Userify deferred API)
    // https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
    api.update_ssh_private_key_deferred(
        cache_load("me").id,
        formData, {
            doNotStringify: true,
            contentType: false,
            processData: false,
            cache: false,
            error: function(xhr, textStatus, errorThrown) {
                    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
                        app.click_view_profile();
                        api.display_error(errormsg);
                    });
            }
    })
    .then(function(data, textStatus, xhr) {
        $(".stage form.profile_ssh_private_key").stop().fadeIn(500);
        cache_load("me").ssh_private_key_status = "enabled";
        $(".stage .ssh_private_key_status")
          .html("Private Key Enabled. <span class='link text-danger'"
            +" data-ah-action=delete_ssh_private_key>Disable</link>");
        app.hide_error();
        app.hide_progress();
        app.reload_profile_deferred(app.click_view_profile);
    });
    return false; // Prevent page from submitting.
}

app.click_form_profile_image_upload = function(obj, e, args) {

    /*
    http://stackoverflow.com/questions/12281775/get-data-from-file-input-in-jquery
    http://www.mattlunn.me.uk/blog/2012/05/sending-formdata-with-jquery-ajax/
    http://www.html5rocks.com/en/tutorials/file/xhr2/
    http://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
    */

    $(".stage form.profile_image").stop().fadeOut(500);

    app.show_progress();
    var files = $(".stage input.avatar_upload").prop('files');
    var formData = new FormData($(".stage form.profile_image")[0]);
    // formData.append('secret_token', '12345');

    for (var i = 0, file; file = files[i]; ++i) {
        formData.append(file.name, file);
    }
    //  formData.append('upload', files[0], files[0].name);

    var result = function(data, textStatus, xhr) {

        $(".stage form.profile_image").stop().fadeIn(500);
        app.hide_error();
        app.hide_progress();

        swal("Upload Complete", "New photo uploaded!", "success");

        if (xhr.status == 200) {

            // FIXME this only supports image/jpeg at the moment
            cache_objects("me", {"logo": {"available": true, "mime_type": "image/jpeg"}});
            app.click_view_profile();

            $(".stage .profile_image span.uploaded_photo").html(app.get_logo());
            swal("Upload Complete", "New photo uploaded!", "success");

        } else {
            var error = JSON.parse(xhr.response).error || "Unknown";
            swal("Oops!", error, "error")
        }
    };

    // HTML FormData FileUpload (on jQuery with Userify deferred API)
    // https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
    api.update_logo_deferred(
        cache_load("me").id,
        formData, {
            doNotStringify: true,
            contentType: false,
            processData: false,
            cache: false,
            error: function(xhr, textStatus, errorThrown) {
                    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
                        app.click_view_profile();
                        api.display_error(errormsg);
                    });
            }

    })
    .then(result);


    // var xhr = new XMLHttpRequest();
    // xhr.open('POST', "/api/userify/logo/user_id/" + cache_load("me").id, true);

    // xhr.onload = function(e) {
    //     $(".stage form.profile_image").stop().fadeIn(500);
    //     app.hide_progress();
    //     if (this.status == 200) {

    //         // FIXME this only supports image/jpeg at the moment
    //         cache_objects("me", {"logo": {"available": true, "mime_type": "image/jpeg"}});
    //         app.click_view_profile();

    //         $(".stage .profile_image span.uploaded_photo").html(app.get_logo());
    //         swal("Upload Complete", "New photo uploaded!", "success");

    //     } else {
    //         var error = JSON.parse(this.response).error || "Unknown";
    //         swal("Oops!", error, "error")
    //     }
    // };
    // xhr.send(formData); // multipart/form-data
    return false; // Prevent page from submitting.
}


app.click_display_forgot_password = function(obj, e, args) {
    _ajax.username = $(".stage form.login_form input[name=username]").val();
    swal({
        title: "Password Reset",
        text: "Please enter your username (not email).",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "username",
        inputValue: _ajax.username
    }, function (username) {

        if (username === false) return false;

        if (username === "") {
            swal.showInputError("Need your username (not email).");
            return false;
        }

        api.request_forgotten_password_link_deferred(username)
        .then(function(data) {
            app.hide_error();
            if (data && data.status == "success") {
                swal(
                    "Password Reset",
                    "Success! Expect an email in a few moments. This reset code will expire in sixty minutes.",
                    "success"
                )
            } else {
                swal(
                    "Oops!",
                    "Something went wrong! Was that your correct username?",
                    "error"
                )
            }
        });

    });
}


app.get_new_password = function(title, callback) {
    swal({
        title: title,
        text: _ajax.username + ", please enter your new password.",
        type: "input",
        inputType: "password",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "new password"
    }, function (password) {
        if (password === false) return false;
        if (password === "") {
            swal.showInputError("Don't forget to choose your new password :)");
            return false;
        }
        if (password.length < 8) {
            swal.showInputError("Please make your password at least eight characters.");
            return false;
        }
        callback(password);
    });
}


app.click_reset_password_with_code = function(obj, e, args) {

    var reset_code = args.reset_code;

    app.get_new_password("Password Reset", function (password) {

        app.prepare_token(_ajax.username, password);

        api.reset_password_with_code_deferred(reset_code, {"password": _ajax.token},
            {error: function(xhr, textStatus, errorThrown) {
                swal(
                    "Oops!",
                    eval('status=' + xhr.responseText).error,
                    "error"
                );
                app.click_display_login_form();
             api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
                api.display_error(errormsg);
            })}}
        )
        .then(function(data) {
            app.hide_error();
            if (data && data.status == "success") {
                swal(
                    "Password Reset",
                    "Success! Please log in with the new password now.",
                    "success"
                );
                app.click_display_login_form();
            } else {
                swal(
                    "Oops!",
                    "Something went wrong! Was that a current reset code?",
                    "error"
                )
            }
        }
        );

    });
}


app.click_change_password = function(obj, e, args) {

    app.get_new_password("Change Password", function (token) {

        // var new_token = app.hash256(token, _ajax.username);
        var new_token = token;

        api.change_password_deferred({"password": token})
        .then(function(data) {
            app.hide_error();
            if (data && data.status == "success") {
                // _ajax.token = new_token;
                _ajax.token = token;
                Cookies.set("username", _ajax.username, app.cookie_settings);
                Cookies.set("token", _ajax.token, {"expires": 14}, app.cookie_settings);
                swal(
                    "Password Reset",
                    "Successfully reset password.",
                    "success"
                );
            } else {
                swal(
                    "Oops!",
                    "Something went wrong resetting your password.",
                    "error"
                )
            }
        }
        );

    });
}

app.click_delete_ssh_private_key = function(obj, e, args) {
  // set ssh_private_key_status to disabled.
  app.update_profile({"ssh_private_key_status": "disabled"});
  app.click_view_profile();
}

app.update_profile = function(profile) {
    $(".stage .waitanimate").waitanimate(true);
    // $("button.btn-success", ".stage").prop("disabled", true);
    var me = cache_load("me");
    $.extend(me, profile);
    /*
     * this can temporarily lead an attacker to believe that
     * an XSS attack was successful, since it will appear to work
     * for him until the next load (since the sanitation is
     * occurring server-side. not a big deal; does not extend beyond
     * non-intelligent XSS testing
     */
    app.show_progress();
    api.update_my_profile_deferred(me,
        { error: function(xhr, textStatus, errorThrown) {
                api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
                    app.click_view_profile();
                    api.display_error(errormsg);
                });
            $(".stage button[data-ah-action='form_profile_update']").prop("disabled", false);
            $(".stage .saved_error").stop().fadeIn(300).delay(2000).fadeOut(700);
        }
    })
    .then(function(profile) {
        app.hide_progress();
        // app.hide_error();
        $(".stage .waitanimate").waitanimate(false);
        cache_object("me", me);

        // $("button.btn-success", ".stage").prop("disabled", false);
        // app.update_me_onscreen();
        // app.click_my_profile();
        $(".stage button[data-ah-action='form_profile_update']").prop("disabled", false);
        $(".stage .saved_success").stop().fadeIn(300).delay(2000).fadeOut(700);


        // a = $(".stage button.btn-success .completed")
        // a.find("i").css("opacity", "1");
        // a.fadeIn(1000).delay(2000).fadeOut(1000);
    });
}

app.click_form_profile_update = function(obj, e, args) {

    var profile = formscrape(".stage form.profile");

    app.update_profile(profile);

    /*
    if (! profile.username) profile.username = _ajax.username;

    // this is no longer used, since we do not allow username changes anymore:
    if (_ajax.username != profile.username) {
        if (
            profile.username.includes(".") ||
            profile.username.includes("-") ||
            profile.username.includes("@") ) {
            swal({
                    title: "Possibly incompatible characters used.",
                    text: "Although ., @, and _ are part of the POSIX standard, "
                        + " many Linux distributions do not permit them in either usernames"
                        + " or sudo configurations because of potential issues"
                        + " in shell scripting. We recommend you do not use these"
                        + " characters for maximum compatibility.",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#BB1B1B",
                    confirmButtonText: "I'm OK with that."
            }, function(isConfirm) {
                if(isConfirm) { app.update_profile(profile); }
            });
        } else {
            app.update_profile(profile);
        }
    } else {
        app.update_profile(profile);
    }
    */
}

app.click_import_gitlab_key = function(obj, e, args) {
    args.gitlab = true;
    return app.click_import_github_key(obj, e, args);
}

app.click_import_github_key = function(obj, e, args) {

    var source = "github";
    if (args.gitlab) {
      var source = "gitlab";
    }

    var me = cache_load("me");

    swal({
        title: "Import Key from " + source,
        text: "If you've already uploaded your SSH public key to " + source + ", please VERIFY your correct username at " + source + ":",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: me.username
    },
    function (inputValue) {
        if (inputValue === false) return false;

        if (inputValue === "") {
            var external_identifier = me.username;
        } else {
            var external_identifier = inputValue;
        }

        app.show_progress();

        // var external_identifier = $(".stage form.profile .external_identifier").val();
        // api.get_github_ssh_key_deferred(external_identifier)
        //
        //
        api.get_external_key_deferred(source, external_identifier, "ssh")
        .then(function(data) {
            console.dir(data);
            app.hide_error();
            app.hide_progress();
            swal({
                customClass: "wide-sweetalert ssh_key_confirm",
                title: "Found it!",
                text: "Successfully imported key for " + source + ": " + external_identifier + ".<br><b>Please ensure it is CORRECT before saving.</b><br><br><textarea ssh_key disabled>" + data.key + "</textarea>",
                html: true,
                closeOnConfirm: false,
                closeOnCancel: true,
                showCancelButton: true,
                allowOutsideClick: true,
                type: "warning"
            }, function(isConfirm) {
                if (isConfirm) {
                    swal("Great!", "Your key has been replaced. Don't forget to click save if you're happy with your new settings!", "success");
                    $('.stage textarea[name="ssh_public_key"]').val(data.key);
                } else {
                    swal("Canceled", "Your key has been left alone.", "error");
                }
            });
        });
    });
}

// userify-profile end
//

;; ///-----------------------------------\\\\


/* Project Menu */

////// USERIFY 4 ///////////



app.click_redisplay_project_menu = function(obj, e, args) {
  app.initialize_left_menu();
}


app.display_project_menu = function(element, companies){
  var project_menu = $(element).empty();


  /*
  // Display a SELECT drop-down menu
  // this still has bugs.. FIXME
  var $select = $("<select class=company_dropdown />");
  var current_company_id = cache_load("current_company_id");
  if (!current_company_id) current_company_id = "xx";
  _.each(companies, function(company) {
    var c = '<option data-ah-action=display_project_list'
      + ' class="project_menu_company" '
      // + ' data-company_id="' + company.id + '"'
      + ((company.id == current_company_id) ? " selected " : "")
      + '>'
      + company.name + '</option>';
    $select.append($(c).data("args", {company_id: company.id}));
  });

  $select.append("<option data-ah-action=redisplay_project_menu "
    + " class=project_menu_company "
    + ((current_company_id == "xx") ? " selected " : "")
    + ">Expand All</option>");

  project_menu.append($select);
  */

  project_menu.append("<div class=project_menu_projects>");
  /* display all company projects */
  // if (cache_load("me").display_all_companies) {
  var count = 0;

  if (companies.length != 0) {
    _.each(companies, function(company) {
      // count ++; if (count > 1) return;
      app.click_display_project_list(null, null,
        {company_id: company.id, dontempty: true})
    });
    // $(".stage .add_company_button").hide();
  }

  // } else {
  //   app.click_display_project_list(null, null, {company_id: _.keys(companies)[0]})
  // }

  // "Add company" and "refresh" buttons
  project_menu.append($("<div>").fillup("project_menu_button_buttons"));
  if (server_status.hidden_add_company) {
    $(".stage .hidden_add_company").hide();
  }
  // $(".hide_on_" + app.edition_lower).hide();

  if (companies.length == 0) {
    $(".project_menu_projects").append("<p>No company access.</p>");
  }

  return project_menu;
}

app.click_display_project_list = function(obj, e, args) {

  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  cache_object("current_company_id", args.company_id);
  $(".company_dropdown option").prop("selected", false);
  // FIXME add edit?
  $(".company_dropdown option[data-company_id='" + args.company_id + "']").prop("selected", true);

  var $menu = $(".project_menu_projects");
  if (! args.dontempty) $menu.empty();

  // add company to project listing
  var company_header = $(
    '<div class="project_menu_company'
      // + ((company.id == args.company_id)?" active":"")
      + '" data-ah-action="company">' + do_not_safify(company.name) + ' </div>');

  company_header.data("args", {"company_id": company.id});
  $menu.append(company_header);

  var top_level_projects = app.sorted_projects(
    app.project_ids_to_projects(company,
      app.top_level_project_ids(company)));

  _.each(top_level_projects, function(project) {

    // clickable for desktops..

    var $project = $(
      '<div class="project_menu_project '
        +
          " visible-xs visible-sm visible-md visible-lg"
        // +  (_.keys(cache.companies).length < 3)
        //   ? " hidden-xs  hidden-sm hidden-md hidden-lg"
        //   : " visible-xs  visible-sm visible-md visible-lg"
        + '"'
        + ' data-ah-action="project"'
        + ' data-ah-flip="click:project_view,mainapp"'
        + '>' + do_not_safify(project.name) + '</div>');
    $project.data("args", {company_id: company.id, project_id: project.id});
    $menu.append($project);

    // non-clickable for mobiles..
    /*
    var $project = $(
      '<div class="project_menu_project visible-xs visible-sm hidden-md hidden-lg"' +
        ' style="cursor: default">' + project.name + '</div>');
    $menu.append($project);
    $project.data("args", {company_id: company.id, project_id: project});
    $menu.append($project);
    */

    //
    // recurse child projects
    //

    (loop_through_children = function(company, project_id, depth) {

      var current_company_id = cache_load("current_company_id");
      if (current_company_id != company.id) return;

      var depth = depth || 1;
      var children = app.get_project_children(company, project_id);

      if (0) { // (children.length == 0 && depth == 1) {

        /// // need to show a clickable project link for top-level projects
        /// // on mobile only..
        /// //
        /// // THIS IS BROKEN, abort abort
        /// var cp = $('<div class="project_menu_child link hidden-xs hidden-sm hidden-md hidden-lg"'
        ///   + ' data-ah-action="project"'
        ///   + ' data-ah-flip="click:project_view,mainapp"'
        ///   + repeat("<span class=project_menu_child_indent></span>", depth)
        ///     + project.name
        ///   + '</div>');
        /// cp.data("args", {company_id: company.id, project_id: project.id});
        /// $menu.append(cp);

      } else {

        _.each(children, function(child_project) {

          // don't show clusters:
          // if ("api_id" in child_project) return;
          //
          // BROKEN - wrong project ID
          // disabled since we don't want this behavior anyway
          //
          if (0) {
            console.dir(child_project);
            var cp = $('<div class="project_menu_child link'
              + ' visible-xs visible-sm hidden-md hidden-lg"'
              + ' data-ah-action="project"'
              + ' data-ah-flip="click:project_view,mainapp"'
              + repeat("<span class=project_menu_child_indent></span>", depth)
              + child_project.name
              + '</div>');
            cp.data("args", {company_id: company.id, project_id: child_project.id});
            $menu.append(cp);
            loop_through_children(company, child_project.id, depth+1)
          }
        });

      }
    })(company, project.id);
  });

}

app.click_get_project_shim = function(obj, e, args) {
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);

  // console.log(args.project_id);
  // console.log(args.shim_type);

  api.get_shim_installers_deferred(args.company_id, args.project_id)
  .then(function(data) {

    var lang = {
      "Move Server": "bash",
      "Review Credentials": "python",
      "Instant Deployment": "bash",
      "Deploy with Bash": "bash",
      "Deploy with Chef": "ruby",
      "Deploy with Ansible": "yaml",
      "Deploy with Puppet": "puppet",
      "Deploy with CloudInit (UserData)": "yaml"
    }[args.shim_type];

    // console.dir(data[args.shim_type]);
    app.hide_error();
    app.hide_tips();

    // global:
    shim_string = data[args.shim_type];

    // $(".stage .project_matrix").html({
    $(obj).qtip({
      content: {
        button: true,
        title: "#  " + toTitleCase(args.shim_type) + " Shim Deployment: " + project.name, // html is ok here: "<button>test</button>",
        text: '<pre><code class="language-' + lang + '"'
          +'onclick="(function(event){copyTextToClipboard(shim_string)})()"'
          + '>'
          + Prism.highlight(data[args.shim_type], Prism.languages[lang])
          + '</code></pre>\n'
      },
      show: {
        event: false,
        delay: 0,
        solo: true,
        ready: true,
        effect: false,
        modal: false
      },
      hide: {
        event: false, //"unfocus"
      },
      events: {
        hide: function(event, api) {
          app.hide_tips();
        },
        /* show: function(event, api) {
         *   // // Prevent accidental selection of the button or title
         *   // $(".qtip-titlebar").addClass("unselectable");
         *   // $(".qtip-titlebar").property("onselectstart", "return false;");
         *   // $(".qtip-content code").click(function(obj) {
         *   //   console.log($(obj).html());
         *   //   $(obj).focus().select();
         *   // });
         *   // $(".qtip-content button").addClass("unselectable");
         *   // $(".qtip-content button").property("onselectstart", "return false;");
         * }
         */
      },
      style: {
        classes: app.qtip_theme + " shim_qtip",
      },
      position: {
        target: $(window),
        viewport: $(window),
        my: "center center",   // position of the arrow
        at: "center center" // where pointing at the button
      }
    });
    // this doesn't work because chrome doesn't allow it.
    // $(".qtip-content code").click(app.copy_deployment_to_clipboard)
  });
}

app.has_perm = function(project, perm_name) {
  return _.contains(project.my_permissions, perm_name);
}

app.get_deployment_button = function(args, shim_type, btn_class) {
  // generate shim deployment buttons for menu
  /*
  if (shim_type == "Deploy with Bash") {
    var btn_class = 'btn-success" style="color: white';
  } else {
    var btn_class = "btn-default";
  }
  */
  var btn_class = btn_class || "btn-default";
  var button = $(
    '<button href="#" data-ah-action="get_project_shim"'
    + ' class="header_menu_button btn view_creds view_creds_' + shim_type
    + " "
    + btn_class
    + '">'
    + '<i class="fa fa-fw fa-cloud-download text-purple"></i> '
    + shim_type
    + "</button>\n");
  button.data("args",
    {"company_id": args.company_id,
     "parent_project_id": args.parent_project_id,
     "project_id": args.project_id,
     "shim_type": shim_type,
     "do_not_overwrite": true
    });
  return button
}

app.click_project_header = function(obj, e, args) {

  var company_id = args.company_id;
  var project_id = (args.project_id) ? args.project_id : '';
  var company = app.get_company_by_id(cache_load('companies'), company_id);
  var project = app.get_project_by_id(company, args.project_id);

  // console.dir(project.my_permissions);
  // temporary fix, until ERM is complete:
  // Linux root users can deploy and set perms for other users.

  var menu = $("<div class='qtip_dropdown'>");

  if (app.internal_project_features)
    app.internal_project_features(project, menu, args);

  if ($(obj).find(".instance_count_column.active").length) {
    if ((app.has_perm(project, "list_servers") ||
      app.has_perm(project, "manage_project")) &&
        (
         app.edition != "xxxCloud"
         )
      ) {
        menu.append("<br><h5>Project Metadata:</h5>");
        menu.fillup_append("project_header_button_view_servers");
    }
  }

  // add data to each pre-existing button
  $("[data-ah-action]", menu).data("args",
    {"company_id": args.company_id,
     "parent_project_id": args.parent_project_id,
     "project_id": args.project_id});

  // deployments

  if (app.has_perm(project, "view_project_creds") ||
    app.has_perm(project, "linux_root_login")) {
    menu.append("<br><h5>Deploy to Servers:</h5>");
    menu.append(app.get_deployment_button(args, "Instant Deployment"));
    menu.append(app.get_deployment_button(args, "Move Server"));
    menu.append(app.get_deployment_button(args, "Review Credentials"));
    if ( app.edition != "xxxCloud") {
      menu.append("<br><h5>Pro Deployments:</h5>");
      menu.append(app.get_deployment_button(args, "Deploy with Bash"));
      menu.append(app.get_deployment_button(args, "Deploy with Ansible"));
      menu.append(app.get_deployment_button(args, "Deploy with Chef"));
      menu.append(app.get_deployment_button(args, "Deploy with Puppet"));
      menu.append(app.get_deployment_button(args, "Deploy with CloudInit (UserData)"));
    }
  }

  if (app.has_perm(project, "manage_project")) {
    menu.append("<br><h5>Project Management:</h5>");
    menu.fillup_append("project_header_button_rename_project");
    menu.fillup_append("project_header_button_delete_project");
    menu.fillup_append("project_header_button_revoke_api_key");
  }

  if (app.has_perm(project, "manage_company") && app.edition == "xxxCloud") {
      menu.append("<h5>Upgrades</h5>");
      menu.fillup_append("project_header_button_upgrade");
  }

  if (app.edition == "xxxCloud") {
    menu.append("<br><h5><a target=NEW href=https://userify.com/buynow/>Upgrade</a> for more.. </a></h5>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> Deploy with Bash</a></div>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> Deploy with Ansible</a></div>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> Deploy with Chef</a></div>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> Deploy with Puppet</a></div>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> Deploy with CloudInit (UserData)</a></div>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> View Servers</a></div>");
    menu.append("<div><a class='header_menu_button  btn btn-default header_menu_button-default' href='https://userify.com/buynow/' target=NEW><i class='fa fa-fw fa-arrow-circle-up text-success'></i> Multiple Administrators</a></div>");
  }

  args.menu = menu;
  args.qtip_position = {
    adjust: { method: "shift shift" },
    viewport: $(window),
    my: "top center",// position of the arrow
    at: "bottom center"// where pointing at the button
  }

  // older TD method of headers..
  app.click_display_qtip_menu($(obj).closest("td"), e, args);
  // app.click_display_qtip_menu($(obj).closest("div"), e, args);

  /*
  app.hide_tips();
  if (menu.find("button").length > 1) {
    $(obj).closest("td").qtip({
      content: {text: menu},
      style: app.qtip_theme,
      show: {
        event: false,
        delay: 0,
        solo: true,
        ready: true,
        effect: false,
        modal: false
      },
      hide: 'click',
      position: {
        adjust: { method: "none shift" },
        viewport: $(window),
        my: "top center",// position of the arrow
        at: "bottom center"// where pointing at the button
      }
    });
  } else {
    $(obj).closest("td").qtip({
      content: {text: "No options available."},
      style: app.qtip_theme,
      show: {
        event: false,
        delay: 0,
        solo: true,
        ready: true,
        effect: false,
        modal: false
      },
      hide: 'click',
      position: {
        adjust: { method: "none shift" },
        viewport: $(window),
        my: "top center",// position of the arrow
        at: "bottom center"// where pointing at the button
      }
    });
  } */

  // tabled attempt to create a whole new management panel
  /*
  var pmgmt = $(".stage .project_management");
  var table = $("<table class=outer_project table-fixed->");
  var header = $("<tr class=project_header_row sticky-top>");
  _.each(args.children, function(child) {
    var td = $("<td>");
    td.attr("data-ah-action", "project_header");
    td.data("args", {"company_id": args.company_id, "project_id": child.id});
    td.html(child.name);
    header.append(td);
  });
  table.append(header);
  $(".projects", pmgmt).append(table);
  $(".project_management_menu").html(menu);
  $(".project_management_main").html(
      );
  $(".stage .project_matrix").slideUp(300);
  pmgmt.show(300);
   * */

  // app.click_update_perms($(".qtip"), null, {"company_id": args.company_id});

}

// shortcut for click_project ...
app.change_project = function(company_id, project_id) {
  app.click_project(null, null, {company_id: company_id, project_id: project_id});
}

app.click_shrink_tds = function(obj, e, args) {
  if (parseInt($(".stage table.outer_project").parent().css("width")) - 5
      > parseInt($(".stage table.outer_project").css("width")))
    $(".stage table.outer_project").animate({"width": "100%"});
  else
    $(".stage table.outer_project").animate({"width": "0"});
}

// TABLE VERSION:

app.click_project = function(obj, e, args) {

  // TODO: this is WAY too complex. break up and simplify.

  app.show_progress();
  app.hide_tips();
  api.get_server_licensing_info_deferred();


  // retrieve company, parent (actually current) project.
  // variable naming as 'parent' is because on desktops, you'd
  // only ever see  project.
  cache_object("current_company_id", args.company_id);

  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);

  Cookies.set(_ajax.username + ":last_company", args.company_id, app.cookie_settings);
  // highlight company (shared w/ userify-company);
  $(".stage .project_menu_projects .project_menu_company").each(function() {
    var element = $(this);
    if (element.data("args").company_id == args.company_id) {
      // do nothing
      // element.addClass("active");
      element.removeClass("active");
    } else {
      element.removeClass("active");
    }
  });
  // highlight project
  Cookies.set(_ajax.username + ":last_project", args.project_id, app.cookie_settings);
  $(".stage .project_menu_projects .project_menu_project").each(function() {
    var element = $(this);
    if (element.data("args").project_id == args.project_id)
      element.addClass("active");
    else
      element.removeClass("active");
  });

  // activate main application window view (esp on mobile)
  app.click_display_mainapp();

  $(".stage .mainapp")
    .fillup("project_view")
    .click(app.hide_tips);
  $(".stage .project_server_count").empty();

  // just add current args to EVERY button in this and go from there.
  args.parent_project_id = args.project_id;
  $(".stage .project_view form [data-ah-action]").data("args", args);

  // formplode the data that we got from project (i.e., name) back
  // onto the main app form.
  $(".stage .mainapp form").formplode(project, do_not_safify);

  $(".stage .project_view span.project_name").editable({
    type: "text",
    title: "Enter New Project Name",
    value: unsafify(project.name),
    success: function(response, new_value) {
      var newname = {"name": new_value};
      api.update_project_deferred(
        args.company_id, args.project_id, newname)
      .then(app.refresh_companies);
    }
  });
  $(".stage .project_view span.project_notes").editable({
    type: "textarea",
    title: "Enter New Project Contact",
    value: unsafify(project.notes),
    success: function(response, new_value) {
      var notes = {"notes": new_value};
      api.update_project_deferred(
        args.company_id, args.project_id, notes)
      .then(app.refresh_companies);
    }
  });

  var matrix = $(".stage .project_matrix_table");

  // fixed scrolling
  var cell_column_leftOffset = parseInt($(".stage .user_cells_column").css('left'));
  $("div.project_matrix").scroll(function() {
    $(".stage .user_cells_column").css({
      "left": $(this).scrollLeft() + cell_column_leftOffset
    });
 
  });



  var perms = perms || [
    "linux_user_login",
    "linux_root_login",
    "deployed_ssh_private_key_perm",
    "project_admin",
    "company_admin"];

  var children = app.get_project_children(company, project.id);

  // // we're not ready for this yet..
  // if (children.length == 0) {
  //   children = [project]
  // }

  // begin display

  if (children.length == 0) {

    app.intro_msg(
      "no_server_groups",
      "Create a Server Group",
      "Server groups hold servers and you can change a user's permissions across all the servers in an entire server group with a single click, but don't worry! Server groups can have just a single server if desired."
      + " Server groups are entire functional groups that will have identical user configurations, such as web servers."
    );

    /*
    $(".stage .add_project").qtip({
      content: 'Click + to add a new server group!',
      style: app.qtip_theme, show: true,
      position: {
        adjust: { method: "none shift" },
        viewport: $(window),
        my: "top right",// position of the arrow
        at: "bottom left"// where pointing at the button
      }
    });
    */
    window.scrollTo(0,0);
    matrix.show();
    app.hide_progress();

  } else {

    // hide delete project if more than one sub project
    $(".stage .project_view .delete_project").hide();

    // Retrieve Inherited Project Permissions
    app.show_progress();
    swal.close();
    api.list_inherited_project_permissions_deferred (
      company.id,
      app.get_ids(children).join(","),
      perms.join(",")

    ).then(function(data) {

      app.hide_error();

      // for server view only:
      cache_object("current_project_layout", data);

      // if (!data); return;
      var header_divs = $('<div class="project_header_divs row_wrapper" style="position:fixed;">');
      var table = $("<table class=outer_project>");
      var outer_div = $('<div style="position:relative">');
      // outer_div.append(header_divs);
      outer_div.append(table);

      // draw header row
      var header = $("<tr class=project_header_row>");
      var total_project_servers = 0;

      // draw header cell for each project
      _.each(children, function(child) {

        var instance_count = do_not_safify(data.projects[child.id].instance_count || 0);

        var disp_count = true;
        /*
        if ( app.edition == "Cloud") {
          disp_count = false;
        }
        */

        if (disp_count) {
          var servers = (instance_count === 0) ? "Inactive" : "Active";
          var servers = "0";
          var active_class = (instance_count === 0) ? "" : "active";
        } else {
          var active_class = (instance_count === 0) ? "" : "active";
          var add_s = (instance_count === 1) ? "" : "s";
          // var servers = instance_count + " server" + add_s;
          var servers = instance_count;
        }

        total_project_servers += instance_count;
        if (disp_count) {
          $(".project_server_count").html(
            '<span class="total_servers">Total Servers</span> '
            + do_not_safify(total_project_servers));
        }

        var server_indicator = '<i class="fa fa-circle-o" style="margin-left: 10px; color: rgba(0, 0, 0, .5)"></i>';
        var server_indicator = '';

        var simulate_server_counts = false;
        if (simulate_server_counts) {
          instance_count = Math.floor(Math.random() * 301);
        }

        if (disp_count) { //app.edition === "Cloud") {
          if (instance_count != 0)  {
            server_indicator = '<i class="fa fa-check-circle" style="margin-left: 10px; color: rgba(0, 0, 0, .5)"></i>';
            server_indicator = '<span class="badge badge-success" style="margin-left: 10px;">' + instance_count + '</span>';
          }
        }

        // var instance_count = data.projects[child.id].instance_count;
        // var active_class = (instance_count === 0) ? "" : "active";
        // var add_s = (instance_count === 1) ? "" : "s";
        // // updates
        // var active_class = (instance_count === 0) ? "" : "active";
        // var instance_count = (instance_count === 0) ? "Inactive" : "Active";

        // var button = $("<button>");
        /* OLD HEADER TR STYLE */
        var td = $('<td></td>');
        td.attr("data-ah-action", "project_header");
        td.data("args", {
          "company_id": company.id,
          "parent_project_id": args.project_id,
          "project_id": child.id,
          "children": children});

        var button = $("<button class=project_header_button data-project_id=" + child.id + ">");
        button.html("&nbsp;"
          + do_not_safify(child.name)
          + "<i class='fa fa-caret-down'></i>"
          + server_indicator
          // + (server_indicator ? server_indicator : "<i class='fa fa-caret-down'></i>")
          // + '<i style="font-size: 50%; line-height: 200%; opacity: .5; margin-left: 4px" class="fa fa-chevron-down"></i>'
          + '<span class="instance_count_column ' + active_class + '">'
          // + servers
          + '</span>'
        );
        td.append(button);
        header.append(td);
        /*
        */

        var div = $('<div class="project_header_div">');
        div.attr("data-ah-action", "project_header");
        div.data("args", {
          "company_id": company.id,
          "parent_project_id": args.project_id,
          "project_id": child.id,
          "children": children});
        var button = $("<button class=project_header_button data-project_id=" + child.id + ">");
        button.html("&nbsp;"
          + do_not_safify(child.name)
          + "<i class='fa fa-caret-down'></i>"
          + server_indicator
          // + '<i style="font-size: 50%; line-height: 200%; opacity: .5; margin-left: 4px" class="fa fa-chevron-down"></i>'
          + '<span class="instance_count_column ' + active_class + '">'
          // + servers
          + '</span>'
        );
        div.append(button);
        header_divs.append(div);
      });
      table.append(header);

      // draw project (server group) project_menu row
      // var project_menu_wrapper = $("<tr class=project_menu_row>");
      // project_menu_wrapper.append(
      //   // '<td></td>' +
      //   '<td colspan='
      //   + (Number(children.length) + 1)
      //   + '><div class="project_menu"></div></td>');
      // table.append(project_menu_wrapper);

      // DRAW EACH USER ROW
      // do this in the order that users are provided. (basically random)
      var users = data.users;
      // console.dir(users);
      _.each(users, function(row, user_id) {
        cache_list("users", [row.user]);
        var rowobj = app.draw_project_user_row(company, project, children, user_id, row, args);
        table.append(rowobj);
      });

      // in case the menu was really long, scroll back to the top.
      matrix.append(outer_div);
      app.company_admin_only(company);
      window.scrollTo(0,0);
      // matrix.fadeIn(350);
      app.hide_progress();

      /* sweet matched scrolling, coming right up */


      $('.stage .project_matrix_table').on('scroll', function () {
        $('.stage .user_cells_column').scrollTop($(this).scrollTop());
      });

      /*
      on_resize(function(ph, pw, h, w) {
        // subtract 200px for the top of the screen
        var newheight = (h - 250) + "px";
        $(".stage .project_matrix").css("overflow", "hidden");
        $(".stage .user_cells_column").css("max-height", newheight);
        $(".stage .project_matrix_table").css("max-height", newheight);
      });
      */

      /* collapse left menu if wide columns */

      // this does work, but then `projects` at top of screen doesn't
      // display left menu. :(

      /*
      collapse_left_menu = function(ph, pw, h, w) {
        if ($(".stage .mainapp").width() > $(window).width()) {
          $(".stage .left_menu_wrapper").hide();
          $(".stage .mainapp-wrapper").show();
          $(".stage .left_menu_wrapper").addClass("hidden-xs");
          $(".stage .mainapp-wrapper").removeClass("hidden-xs");
          $(".stage .left_menu_wrapper").addClass("hidden-sm");
          $(".stage .mainapp-wrapper").removeClass("hidden-sm");
          $(".stage .left_menu_wrapper").addClass("hidden-md");
          $(".stage .mainapp-wrapper").removeClass("hidden-md");
          $(".stage .left_menu_wrapper").addClass("hidden-lg");
          $(".stage .mainapp-wrapper").removeClass("hidden-lg");
          $(".stage .navbar-header>.navbar-brand .hidden-sm").removeClass("hidden-sm");
          $(".stage .navbar-header>.navbar-brand .hidden-md").removeClass("hidden-md");
          $(".stage .navbar-header>.navbar-brand .hidden-lg").removeClass("hidden-lg");
        }
      } on_resize(collapse_left_menu);
      */

      $(".stage .project_matrix").fadeIn(90);
      // .doubleScroll();

      // TODO
      // not currently used
      // $(".project_menu").fillup("project_menu_row");

      // TODO also not currently used
      // project permissions testing..
      // app.click_project_perms(null,null, {
      //   company_id: "company_n",
      //   project_id: "project_D",
      //   parent_project_id: "project_j"
      //   });

      // USER SEARCH
      $(".stage .user_search").focus().keyup(function() {
        var searched = $(this).val();
        $(".stage .user_cells_column .user_cell").each(function() {
          var user_id = $(this).data().args.user_id;
          if ($(this).text().includes(searched)) {
            $(this).show();
            $(".stage .project_user_row." + user_id).show();
          } else {
            $(this).hide();
            $(".stage .project_user_row." + user_id).hide();
          }
        });
      });

      // resize project header divs to the right width
      $(".stage tr.project_user_row:first td button.permtag").each(function(idx, val) {
        var project_id = $(this).data().args.child_project_id;
        var width = $(this).closest("td").css("width");
        $(".stage .project_header_div").each(function() {
          var t = $(this);
          if (t.data().args.project_id == project_id)
            t.css("width", width);
        });
      });

      // end list_inherited_project_permissions_deferred
    });

  }

}


app.click_change_row_perms_root = function(obj, e, args) {
  // console.log(obj);
  // console.log(obj.html());
  // console.dir(obj.data("args"));
  var tr = obj.data("args")["tr"];
  // console.log(tr);
  // console.log(tr.find(".permtag"));
  // console.log(tr.find(".permtag").html());
  $(".permtag", tr).each( function(idx, ele) {
    // console.log(idx);
    // console.log($(ele).html());
    // console.dir($(ele).data("args"));
    $(ele).click();
  });

}

app.click_user_row_details = function(obj, e, args) {

  var user_id = args.user_id;

  // console.dir(args);

  // just not available in cache anymore..
  // FIXME
  // return;
  var user = cache_load("users")[user_id];

  var popup_logo = "";

  // if (user.logo.available)
  //   var popup_logo = $("<img class=user_logo src='/api/userify/logo/object_id/" +
  //     user.id + "' style='clear: both; width: 128px; height: auto; margin: 8px 0;'>");

  // if (user_id == cache_load("me").id) { // && user.logo.available) {
  //   var d = new Date();
  //   var src = do_not_safify(popup_logo.attr("src"));
  //   popup_logo.attr("src", src+"?d="+d.getTime());
  // }

  // if (user.logo.available)
  //   var popup_logo = popup_logo.prop("outerHTML");
  // else
  //   var popup_logo = "";

  var last_seen = "";
  if (user.last_seen) {
    var last_seen = " " + $.timeago(new Date(user.last_seen * 1000)) + ".";
  }

  // prep for changing row perms

  var tr = $(obj).closest("tr");
  var data = {user_id: user_id, tr: tr, project_ids: args.project_ids};

  var root_button = $("<button data-ah-action=change_row_perms_root>Row to Root</button><br>").data("args", data);
  var user_button = $("<button data-ah-action=change_row_perms_user>Row to User</button><br>").data("args", data);
  var none_button = $("<button data-ah-action=change_row_perms_none>Row to None</button><br>").data("args", data);

  var pop = $("<div class='project_user_popup'>"
      + popup_logo
      + "<h6>" + do_not_safify(user.name) + "</h6>"
      + "<pre>" + do_not_safify(user.username) + "</pre>"
      + (do_not_safify(user.preferred_shell) ? ("" + do_not_safify(user.preferred_shell) + "<br>") : "")
      + (do_not_safify(last_seen) ? ("Last seen " + do_not_safify(last_seen) + "<br>") : "")
      + "</div>");

  // pop.append(root_button);
  // pop.append(user_button);
  // pop.append(none_button);


  var popup = {
    // title: user.name,
    text: pop
  };

  // var popup = {"text": "<img src='https://10.10.10.10/api/userify/logo/object_id/user_gQBT2u55jqyRP7TmwszdrG' style='clear: both; width: 128px; height: auto; margin: 8px 0;'>" }

  // app.hide_tips();

  $(obj).qtip({
    content: popup,
    show: true,
    hide: 'click',
    style: app.qtip_theme,
    position: {
      viewport: $(window),
      my: "top center",   // position of the arrow
      at: "bottom center" // where pointing at the button
    }
  });

}

//
// PARENT PROJECT

app.display_perm_change = function(user_id, new_perm, company_id, project_id) {
  if (new_perm == "none") {
    $("#" + "id_" + project_id + "_" + user_id).find("button")
      .removeClass("perm_" + "none")
      .removeClass("perm_" + "user")
      .removeClass("perm_" + "root")
      .removeAttr("data-hasqtip")
      .addClass("perm_" + new_perm)
      .do_not_safify(app.add_perm_to_button(new_perm));
      // retrigger the popup
      // .click()
    app.add_perm_badge($("#" + "id_" + project_id + "_" + user_id));
    app.hide_progress();
  } else {
    $("#" + "id_" + project_id + "_" + user_id).find("button")
      .removeClass("perm_" + "none")
      .removeClass("perm_" + "user")
      .removeClass("perm_" + "root")
      .removeAttr("data-hasqtip")
      .addClass("perm_" + new_perm)
      .do_not_safify(app.add_perm_to_button(new_perm));
      // retrigger the popup
      // .click()
    app.add_perm_badge($("#" + "id_" + project_id + "_" + user_id));
  }
}


app.click_project_matrix_change_permission = function(obj, e, args) {
  var user = cache_load("users")[args.user_id];
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);
  var old_perm = args.old_perm;
  var new_perm = app.extract_perm_from_button(obj);
  if (new_perm == "root") new_usergroup = "linux_admins";
  if (new_perm == "user") new_usergroup = "linux_users";
  app.hide_tips();
  app.display_perm_change(user.id, new_perm, company.id, project.id);
  var handle_error = function(xhr, textStatus, errorThrown) {
    app.display_perm_change(user.id, old_perm, company.id, project.id);
    app.hide_progress();
    app.hide_error();
    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
      api.display_error(errormsg);
    });
  }
  api.remove_user_id_from_project_usergroup_deferred(
    company.id, project.id, "linux_users", user.id,
    {error: handle_error})
  .then(function(data) {
    api.remove_user_id_from_project_usergroup_deferred(
      company.id, project.id, "linux_admins", user.id,
      {error: handle_error})
    .then(function(data) {
      if (new_perm != "none") {
        api.add_user_id_to_project_usergroup_deferred(
          company.id, project.id, new_usergroup, user.id,
          {error: handle_error})
        .then(function() {
          app.hide_error();
          app.hide_progress();
        });
      }
    });
  });
}

app.extract_perm_from_button = function(obj){
  var t = $(".perm_button_setting", obj).html();
  if (t) return t.toLowerCase();
  console.warn(t)
  var t = $(obj).html();
  if (t) return t.toLowerCase();
}
app.add_perm_to_button = function(perm){
  return "<span class=perm_button_setting>"
    + toTitleCase(perm)
    + "</span>"
    + "<i class='fa fa-caret-down'></i>"
}

app.click_user_perm_details = function(obj, e, args) {

  var perm_color_level = app.extract_perm_from_button(obj);
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.child_project_id);
  var perms = args.perms;
  var user_id = args.user_id;
  var user = cache_load("users")[user_id];

  var args = {
    "company_id": company.id,
    "project_id": project.id,
    "user_id": user.id,
    "old_perm": args.old_perm.toLowerCase()}

  // build up popup
  var popup = $("<div>").fillup("perm_popup");
  popup.find('.perm_' + perm_color_level).addClass("active");
  popup.find('.popup_username').html(app.get_logo(user) + do_not_safify(user.name));
  popup.find('[data-ah-action]').data("args", args);

  app.hide_tips();
  $(obj).qtip({
    content: {
      text: popup,
      title: {
        text: project.name,
        button: 'close'
      }
    },
    style: app.qtip_theme,
    position: {
      adjust: { method: "shift flipinvert" },
      viewport: $(window),
      my: "top right", // position of the arrow
      at: "bottom right", // where pointing at the button
      // target: [$(this).offset().left, $(this).offset().top]
    },
    show: {
      event: false,
      delay: 0,
      solo: true,
      ready: true,
      effect: false,
      modal: false
    },
    hide: 'click'
  });

}

app.draw_user_box = function(user, args) {

  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  // var project = app.get_project_by_id(company, args.project_id);
  user.name = do_not_safify(user.name) ? user.name : "";
  user.username = do_not_safify(user.username) ? user.username : "";
  if (typeof user.username === 'object') user.username = "";
  if (typeof user.id === 'object') user.id = "";
  if (typeof user.name === 'object') user.name = "";

  if (user.name.split(" ")[1]) {
    // first name last initial:
    // var uname = user.name.split(" ")[0] + "&nbsp;" + user.name.split(" ")[1].slice(0,1) + ".";
    var uname = do_not_safify(user.name) + "<br><span class=username>" + do_not_safify(user.username) + "</span>";;
  } else {
    if (user.name) {
      var uname = do_not_safify(user.name) + "<br><span class=username>" + do_not_safify(user.username) + "</span>";
    } else {
      if (user.email && user.email.length > 0) {
        var uname = do_not_safify(user.email.split("@")[0]) + "<br><span class=username>" + do_not_safify(user.username) + "</span>";;
      } else {
        var uname = do_not_safify(user.username);
      }
    }
  }

  var user_info_div = $("<div class=project_user>"
      + app.get_logo(user)
      + "<div class=user_fullname>" + uname + "</div></div>");

  if (user.ssh_public_key && user.ssh_public_key.length > 1) {
    $(".user_logo_wrapper", user_info_div)
      .prepend("<span class='textbadge ssh'>SSH</span>");
  }

  if (user.mfa && user.mfa.enabled)
     $(".user_logo_wrapper", user_info_div)
       .prepend("<span class='textbadge mfa'>MFA</span>");

  if (_.contains(company.admins, user.id))
    $(".user_logo_wrapper", user_info_div)
      .prepend("<span class='textbadge admin-company'>ADM</span>");

  return user_info_div.html();

}

// DRAW EACH ROW
app.draw_project_user_row = function(company, project, children, user_id, row, args) {

  var user = row.user;

  // draw user details
  var out_row = $('<tr class="project_user_row ' + user.id + '">');
  var user_cell = $('<div class="user_cell row_wrapper ' + user.id + '" data-ah-action=user_row_details>');
  user_cell.data("args", {user_id: user.id, project_ids: []});
  user_cell.append(app.draw_user_box(user, args));

  // user_cells_column is the single left column that
  // displays user details (name, username, etc)
  $(".stage .user_cells_column").append(user_cell);

  _.each(children, function(child) {

      var perms = row.projects[child.id];
      var user_perms = perms.inherited;

      user_cell.data("args")["project_ids"].push(child.id);

      var perm_color_level = "user";
      if (_.contains(user_perms, "linux_root_login")) {
        var perm_color_level = "root";
        var perm_button = "Root";
      } else if (_.contains(user_perms, "linux_user_login")) {
        var perm_color_level = "user";
        var perm_button = "User";
      } else {
        var perm_color_level = "none";
        var perm_button = "<i class='fa fa-toggle-off'></i>";
        var perm_button = "<i class='fa fa-times'></i>";
        // NOTE: Changing the perm_button means that
        // .find() can't match on the word 'none'
        var perm_button = "None";
      }

      var obj = $("<td class=perm_cell>")
      obj.attr("id", ["id", child.id, user.id].join("_"));
      var button = $("<button>");
      button.addClass("btn btn-default");
      button.addClass("permtag");
      button.addClass("perm_" + perm_color_level);
      // if (perm_color_level == "none")
      //   button.addClass("btn btn-default");
      // else if (perm_color_level == "user")
      //   button.addClass("btn btn-success");
      // else if (perm_color_level == "root")
      //   button.addClass("btn btn-alert");

      // Draw standard Root/User/None button
      button.attr("data-ah-action", "user_perm_details");
      button.html(app.add_perm_to_button(perm_button));
      button.data("args", {
        company_id: company.id,
        child_project_id: child.id,
        user_id: user.id,
        old_perm: perm_button,
        perms: perms});
      obj.append(button);

      // Add Private Key Distribution ('key' icon) button

      var me = cache_load("me");

      // this is pointless if the user has no private key
      // (or if the viewer isn't a company admin)
      if (_.contains(company.admins, me.id) && user.ssh_private_key_status == "enabled") {
        api.list_users_in_a_project_usergroup_deferred(company.id,child.id,"deployed_ssh_private_key_perm_group")
        .then(function(active_deployed_ssh_private_key_perm_groups){
          var deployed_ssh_private_key_perm = _.contains(_.keys(active_deployed_ssh_private_key_perm_groups.active), user.id);
          var enabled = (user.ssh_private_key_status == "enabled");
          var enabled_text = (deployed_ssh_private_key_perm)?"Disable":"Enable"
          var toggle_ssh_private_key = $(
           "<span style='margin-left:1rem; width=4rem;'"
            +" data-ah-action=toggle_ssh_private_key"
            +"><i"
            +((deployed_ssh_private_key_perm)?" style='color:gold'":" style='color:lightgray'")
            +" class='fas fa-key cursor-pointer'></i>"
           +"</span>");
          toggle_ssh_private_key
            .qtip({
              content: enabled_text + ' private key distributions across'
                +' all servers in this group',
              style: app.qtip_theme,
              position: {
                adjust: { method: "none shift" },
                viewport: $(window),
                my: "bottom right",// position of the arrow
                at: "top center"// where pointing at the button
              }
            })
            .data("args", {
              company_id: company.id,
              project_id: project.id,
              child_project_id: child.id,
              user_id: user.id,
              deployed_ssh_private_key_perm: deployed_ssh_private_key_perm,
            });
          obj.append(toggle_ssh_private_key);
        });
      } else {
        obj.append("<span style='margin-left:1rem; width=4rem;'>"
          +"<i class='fas fa-key' style='color:transparent'></i></span>");
      }
      // deployed_ssh_private_key_perm
      out_row.append(obj);
  });

  // if (app.edition_lower != "cloud")
    app.add_perm_badge(user_cell, out_row);
  //
  return out_row
}

app.click_toggle_ssh_private_key = function(obj, e, args) {

  var user_id = args.user_id;
  var user = cache_load("users")[user_id];
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var parent_project_id = args.project_id;
  var project = app.get_project_by_id(company, args.child_project_id);

  app.hide_tips();
  var handle_error = function(xhr, textStatus, errorThrown) {
    app.display_perm_change(user.id, old_perm, company.id, project.id);
    app.hide_progress();
    app.hide_error();
    api.ajax_error(xhr, textStatus, errorThrown, function(errormsg) {
      api.display_error(errormsg);
    });
  }
  if (args.deployed_ssh_private_key_perm){
    api.remove_user_id_from_project_usergroup_deferred(
      company.id, project.id, "deployed_ssh_private_key_perm_group", user.id,
      {error: handle_error})
    .then(function(data) {
      swal.close();
      app.hide_error();
      app.refresh_companies(function(companies) {
        app.change_project(args.company_id, parent_project_id);
        scroll_top();
      });
    })
  }else{
    api.add_user_id_to_project_usergroup_deferred(
      company.id, project.id, "deployed_ssh_private_key_perm_group", user.id,
      {error: handle_error})
    .then(function(data) {
      swal.close();
      app.hide_error();
      app.refresh_companies(function(companies) {
        app.change_project(args.company_id, parent_project_id);
        scroll_top();
      });
    })
  }

  // end click_toggle_ssh_private_key
}

app.add_perm_badge = function(cell, out_row) {
  // walk through the row looking for
  // the highest-level permissions and add a badge for them.
  var out_row = out_row || cell;
  var max_perm = "none";
  if (!cell) {
    console.log("unable to parse cell for add_perm_badge");
    return;
  }
  if ($(out_row)
    .closest(".project_user_row")
    .find(".perm_user").length !== 0) max_perm = "user";
  if ($(out_row)
    .closest(".project_user_row")
    .find(".perm_root").length !== 0) max_perm = "root";
  $(cell)
    .find(".perm.textbadge")
    .remove();
  $(cell)
    .find(".user_logo_wrapper")
    .prepend("<div class='textbadge perm "
      + max_perm + "'>" + max_perm + "</div>")
    // .find(".perm.textbadge").effect("bounce",500)
    ;
}


app.click_add_project = function(obj, e, args) {
  var company_id = args.company_id;
  if (args.parent_project_id) {
    var title = "Create Server Group";
    var text = "Please enter the new server group name.";
    var placeholder = "New Server Group Name (i.e., DB or Web)";
  } else {
    var title = "Create Project";
    var text = "Please enter the new project name.";
    var placeholder = "New Project Name";
  }
  swal({
    title: title,
    text: text,
    type: "input",
    showCancelButton: true,
    closeOnConfirm: false,
    animation: "slide-from-top",
    inputPlaceholder: placeholder
  },

  function (project_name) {
    if (project_name === false) return false;

    if (project_name === "") {
      swal.showInputError("Need a project name -- but you can change it later!");
      return false
    }

    var new_project = {name: project_name};
    app.show_progress();
    swal.close();

    var project_created = function(data) {
      app.hide_error();
      app.hide_progress();
      if (data.status && data.status != "success") {
        swal("Oops!",
          "Creating new project" + project_name + " did not work.",
          "error");
      } else {
        app.refresh_companies(function(companies) {
          // app.click_company(null, null, {"company_id": args.company_id});
          if (args.parent_project_id) {
            // display helper tip
            setTimeout(function() {
              console.log(($(".stage .project_header_button").length));
              if ($(".stage .project_header_button").length == 1)
                $(".stage .project_header_button[data-project_id=" + data.project_id + "]")
                  .highlight()
                  .qtip({
                    content: 'Click to deploy a server!',
                    style: app.qtip_theme, show: true,
                    position: {
                      adjust: { method: "none shift" },
                      viewport: $(window),
                      my: "bottom right",// position of the arrow
                      at: "top center"// where pointing at the button
                    }
                  });
            }, 1000);

            app.change_project(args.company_id, args.parent_project_id);

          } else {
            app.change_project(args.company_id, data.project_id);
          }
          scroll_top();
        });
      }
    }

    if (args.parent_project_id) {
      api.create_child_project_deferred(company_id, args.parent_project_id, new_project)
      .then(project_created);
    } else {
      api.create_project_deferred(company_id, new_project)
      .then(project_created);
    }
    return false;

  });
}

app.click_revoke_api_key = function(obj, e, args) {
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);
  swal({
    title: "Are you sure?",
    text: "WARNING This deletes the server API key and re-creates. Servers will be unable to update their users. You will have to retrieve the new key and update existing servers.",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Yes, revoke this key!",
    closeOnConfirm: false
  },
  function() {
    var updated_project = {api_key_regen: true};
    app.show_progress();
    swal.close();
    api.update_project_deferred(
      args.company_id, args.project_id, updated_project)
    .then(function(data) {
      swal.close();
      swal("Success!",
        project.name + " now has revoked and re-created API keys.",
         "success");
      app.hide_error();
      app.refresh_companies(function(companies) {
        app.change_project(args.company_id, args.parent_project_id);
        scroll_top();
      });
    });
  });
}

app.click_rename_project = function(obj, e, args) {
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);
  swal({
    title: "Rename Server Group",
    text: "Please enter the new name.",
    type: "input",
    showCancelButton: true,
    closeOnConfirm: false,
    animation: "slide-from-top",
    inputPlaceholder: "New Name"
  },
  function (project_name) {
    if (project_name === false) return false;

    if (project_name === "") {
      swal.showInputError("Need a name -- but you can change it later!");
      return false
    }

    var new_project = {name: project_name};
    app.show_progress();
    api.update_project_deferred(
      args.company_id, args.project_id, new_project)
    .then(function(data) {
      swal.close();
      app.hide_error();
      app.refresh_companies(function(companies) {
        app.change_project(args.company_id, args.parent_project_id);
        scroll_top();
      });
    });
  });
}



app.click_delete_project = function(obj, e, args) {
  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);

  swal({
    title: "Are you sure?",
    text: "You will not be able to recover "
      + project.name
      + " once deleted. \n"
      + "WARNING This deletes any server API credentials. Servers that log in will be unable to update their users. Only proceed if servers have been updated.",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Yes, delete it!",
    closeOnConfirm: false
  }, function(){
    /* swal({
      title: "Are you REALLY REALLY sure?",
      text: "DELETING " + project.name
        + ".\n"
        + "WARNING This deletes server API credentials and any servers contained in this project will be unable to update their users. Only proceed if all contained servers have been updated.",
      type: "error",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "DELETE!",
      closeOnConfirm: false
    }, function(){ */
      app.show_progress();
      api.delete_project_deferred(args.company_id, args.project_id)
      .then(function(data) {
        app.hide_progress();
        app.hide_error();
        if (data.status == 'success') {
          // swal("Deleted!",
          //   project.name + " has been deleted.",
          //    "success");
          swal.close();
          app.refresh_companies(function(companies) {
            scroll_top();
            if (args.parent_project_id &&
              args.parent_project_id != args.project_id) {
                app.change_project(args.company_id, args.parent_project_id);
            } else {
              app.click_company(null, null, {"company_id": args.company_id});
              // app.click_view_profile();
            }
          });
        }
      });
    // });
  });
}


app.click_project_perms = function(obj, e, args) {

  var company = app.get_company_by_id(cache_load("companies"), args.company_id);
  var project = app.get_project_by_id(company, args.project_id);

  app.hide_tips();

  // activate main application window view (esp on mobile)
  app.click_display_mainapp();

  $(".stage .mainapp")
    .fillup("project_permissions");

  // formplode the data that we got from project (i.e., name) back
  // onto the main app form.
  $(".stage .mainapp form").formplode(project, do_not_safify);

}



// userify-project end

;; ///-----------------------------------\\\\


function copy_text(element) {
    //Before we copy, we are going to select the text.
    var text = document.getElementById(element);
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
    //add to clipboard.
    document.execCommand('copy');
}

;; ///-----------------------------------\\\\


app.click_view_project_servers = function(obj, e, args) {

    var company = app.get_company_by_id(cache_load("companies"), args.company_id);
    var project = app.get_project_by_id(company, args.project_id);

    api.list_project_servers_deferred(args.company_id, args.project_id)
    .then(function(data) {

        var instance_count = data.projects[args.project_id].instance_count;
        $(".stage .project-data").hide();
        /*
         * C8o_project: {instances: [,…], instance_count: 1}
    instance_count: 1
    instances: [,…]
    0: {root_user_count: 1, local_ip: "192.169.71.135", ts: 1449110307, project_id: kC8o_project",…}
    local_ip: "192.169.71.135"
    ipdata: {
        city: "Ashburn"
        country: "US"
        hostname: "ec2-192-168-71-135.compute-1.amazonaws.com"
        ip: "192.169.71.135"
        loc: "39.0437,-77.4875"
        org: "AS14618 Amazon.com, Inc."
        postal: "20147"
        region: "Virginia"
    normal_user_count: 0
    project_id: "okC8o_project"
    root_user_count: 1
    ts: 1449110307
    */

        app.hide_tips();

        $(".stage div.project_matrix").css("padding-left", "0");
        var table = $("<table style='width: 100%;' class='table table-striped display table-fixed'>");


        var thead = $("<thead>");
        var row = $("<tr>");
        var th = $("<th class=''>"); row.append(th);
        var th=$("<th class=''>"); th.do_not_safify("Local IP"); row.append(th);
        var th=$("<th class=''>"); th.do_not_safify("IP"); row.append(th);
        // var th=$("<th class=''>"); th.do_not_safify("Provider"); row.append(th);
        // var th=$("<th class=''>"); th.do_not_safify("City"); row.append(th);
        // var th=$("<th class=''>"); th.do_not_safify("Region"); row.append(th);
        // var th=$("<th class=''>"); th.do_not_safify("Country"); row.append(th);
        var th=$("<th class=''>"); th.do_not_safify("Hostname"); row.append(th);
        var th=$("<th class=''>"); th.do_not_safify("LooseKeys"); row.append(th);
        // var th=$("<th class=''>"); th.do_not_safify("Root Users"); row.append(th);
        // var th=$("<th class=''>"); th.do_not_safify("Normal Users"); row.append(th);
        var th=$("<th class='xhidden'>"); th.do_not_safify("First Seen"); row.append(th);
        var th=$("<th class=''>"); th.do_not_safify("Last Seen"); row.append(th);
        // var th=$("<th class='xhidden'>"); th.do_not_safify("Coordinates"); row.append(th);
        thead.append(row);
        table.append(thead);


        tbody = $("<tbody>");
        table.append(tbody);
        $(".stage .project_matrix")
            .empty()
            .append(table);


        /*
         * var row = $("<tr>");
         * var td = $("<td colspan=13>");
         * td.do_not_safify("No servers yet -- add some!");
         * row.append(td);
         * table.append(row);
         *
         */
        // need something to empty below
        var td = $("<td>");

        /*
        data.projects[args.project_id].instances = [
            {"local_ip": "192.168.1.1",
             "remote_ip": "89.233.43.71",
            }
        ]
        */

        var project_servers = 0;

        if (data.projects[args.project_id].instances) {

            td.empty();

            _.each(data.projects[args.project_id].instances, function(instance) {

                if ( app.edition != "xxxCloud") {
                    project_servers += 1;
                    $(".stage .project_server_count").html(
                        '<span class="total_servers">Total Servers</span> '
                        + do_not_safify(project_servers));
                }

                var row = $("<tr>");

                var local_ip = instance.local_ip;
                var remote_ip = instance.remote_ip || "";
                var icon = '<img class="server_icon" src="/box-icons/ips-server-narrow.png">';
                var provider_name = "Server";
                var country = "N/A";
                var region = "N/A";
                var city = "N/A";
                var hostname = local_ip;
                var root_user_count = instance.root_user_count;
                var normal_user_count = instance.normal_user_count;
                var first_seen = instance.first_seen;
                var last_seen = instance.last_seen;
                var coordinates = instance.loc;
                var metadata = {};
                var lkeys = null;
                var loose_keys = "";
                if (instance.metadata) {
                  metadata = instance.metadata;
                  console.log("metadata.hostname:" + metadata.hostname);
                  if (metadata.hostname){
                      console.log("Preferring metadata.hostname:" + metadata.hostname);
                      hostname = metadata.hostname;
                  }
                  var lkeys = metadata.loose_keys;
                }

                if (instance.metadata && instance.metadata.loose_keys){
                  var loose_keys = $("<span></span>");
                  for (var i = 0; i < instance.metadata.loose_keys.length; i++) {
                    var irow = instance.metadata.loose_keys[i];
                    var username = irow.split(/\n/)[0];
                    var userbadge = $("<span class='badge badge-danger'>" + username + "</span>");
                    userbadge.qtip({
                      content: irow.split(/\n/).slice(1).join("<br>\n"),
                      style: app.qtip_theme,
                      position: {
                        adjust: { method: "none shift" },
                        viewport: $(window),
                        my: "bottom right",// position of the arrow
                        at: "top center"// where pointing at the button
                      }
                    })
                    loose_keys.append(userbadge);
                  }
                }

                if (instance.remote_ipdata) {

                    // basics..
                    var ipdata = instance.remote_ipdata;
                    if (ipdata.city)
                        var city = ipdata.city;
                    if (ipdata.region)
                        var region = ipdata.region;
                    if (ipdata.country)
                        var country = ipdata.country;
                    if (ipdata.hostname){
                        console.log("Preferring ipdata.hostname:" + ipdata.hostname);
                        hostname = ipdata.hostname;
                    }

                    if (ipdata.org && ipdata.org.indexOf("Digital Ocean") > -1) {
                        var provider_name = "Digital Ocean";
                        var icon = '<img class="server_icon" src="/box-icons/ips-do-narrow.png">';
                    }
                    if (metadata && metadata["ami-id"] && metadata["ami-id"].indexOf("ami") > -1) {
                        var provider_name = "EC2 (VPC)";
                        var icon = '<img class="server_icon" src="/box-icons/ips-ec2-narrow.png">';
                    }
                    if (ipdata.org && ipdata.org.indexOf("Amazon") > -1) {
                        var provider_name = "EC2";
                        var icon = '<img class="server_icon" src="/box-icons/ips-ec2-narrow.png">';

                        if (ipdata.city != "Tokyo" && ipdata.city != "Singapore")
                            var city = ipdata.city + ", " + ipdata.region;

                        if (ipdata.region && ipdata.region.indexOf("Virginia") > -1)
                            var region = "US-East-1";
                        if (ipdata.region && ipdata.region.indexOf("Oregon") > -1) {
                            var region = "US-West-2";
                            if (hostname && hostname.indexOf("us-gov") > -1)
                                var region = "US-Gov-West-2";
                        }
                        if (ipdata.region && ipdata.region.indexOf("California") > -1)
                            var region = "US-West-1";
                        if (ipdata.country && ipdata.country === "JP")
                            var region = "AP-NorthEast-1";
                        if (ipdata.country && ipdata.country === "SG")
                            var region = "AP-SouthEast-1";
                        if (ipdata.country && ipdata.country === "AU")
                            var region = "AP-SouthEast-2";
                        if (ipdata.city && ipdata.city === "Beijing")
                            var region = "CN-North-1";
                        if (ipdata.country && ipdata.country === "IE")
                            var region = "EU-West-1";
                        if (ipdata.country && ipdata.country === "DE")
                            var region = "EU-Central-1";
                        if (ipdata.country && ipdata.country === "BR")
                            var region = "SA-East-1";
                        if (ipdata.country && ipdata.country === "BR")
                            var region = "SA-East-1";
                    }
                }

                var td = $("<td>");
                td.append(icon);
                row.append(td);

                var td=$("<td>"); td.html("<b>" + do_not_safify(local_ip) + "</b>"); row.append(td);
                var td=$("<td>"); td.html('<b>'
                        + '<a target=NEW href="https://' + do_not_safify(remote_ip) + '">' + '<span class="label label-success" style="border-radius: 3px; font-size: 75%; margin-right: .25em; vertical-align: middle; "><i class="fa fa-lock"></i></span></a>'
                        + '<a target=NEW href="http://' + do_not_safify(remote_ip) + '">' + '<span class="label label-warning" style="border-radius: 3px; font-size: 75%; margin-right: .5em; vertical-align: middle; "><i class="fa fa-unlock"></i></span></a>'
                        + do_not_safify(remote_ip)
                        + "</b>"

                        );


                row.append(td);
                // var td=$("<td>"); td.do_not_safify(provider_name); row.append(td);
                // var td=$("<td>"); td.do_not_safify(city); row.append(td);
                // var td=$("<td>"); td.do_not_safify(region); row.append(td);
                // var td=$("<td>"); td.do_not_safify(country); row.append(td);
                var td=$("<td>"); td.do_not_safify(hostname); row.append(td);
                var td=$("<td>"); td.do_not_safify(loose_keys); row.append(td);
                // no data available yet..
                // var td=$("<td>"); td.do_not_safify(root_user_count); row.append(td);
                // var td=$("<td>"); td.do_not_safify(normal_user_count); row.append(td);

                var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(first_seen);
                var td=$("<td class=timedate>"); td.do_not_safify(d); row.append(td);

                var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(last_seen);
                var td=$("<td class=timedate>"); td.do_not_safify(d); row.append(td);
                // var td=$("<td class='xhidden'>"); td.do_not_safify(coordinates); row.append(td);

                tbody.append(row);
            });
        }

        // Data Table
        dt = table.DataTable({
            buttons: [ 'copy', 'csv', 'excel' ],
            colReorder: true,
            fixedColumns: {leftColumns: 2},
            fixedHeader: true,
            keys: true,
            responsive: true,
            rowReorder: false,
            // (index):7043 Uncaught TypeError: Cannot read property 'appendChild' of undefined
            scroller: false,
            select: false
        });

        dt.on("draw.dt", function() {
            $(".timedate", table).timeago();
        });


        $(".stage .project_name").parent().empty().append(do_not_safify(project.name) + " <small>Server View</small>");
        // $(".stage .project_name").parent().parent().append("<p>This feature does not yet provide complete results from a NAT'ed, VPC, or proxied server.</p>");

    });
}

;; ///-----------------------------------\\\\


app.click_display_qtip_menu = function(obj, e, args) {

    app.hide_tips();

    // menu provided already?
    if (args.menu) {
        var menu = args.menu;
    } else {
        // an offstage menu button name?
        var menu = $("<div class=qtip_dropdown>");
        if (args.menu_name)
            menu.fillup(args.menu_name);
    }

    // a list of menu button names?
    if (args.menu_buttons) {
        _.each(args.menu_buttons, function(menu_button_name) {
            menu.fillup_append(menu_button_name);
        });
    }

    // set position.. this is always the same..
    var position = args.qtip_position || {
        adjust: { method: "none shift" },
        viewport: $(window),
        my: "top right" ,// position of the arrow
        at: "bottom left" // where pointing at the button
    }

    // attach data as necessary
    $("[data-ah-action]", menu).each(
        function(idx, inner_obj) {
            var inner_obj = $(inner_obj);
            if (!inner_obj.data("args") || inner_obj.data("args")["do_not_overwrite"] != true)
                inner_obj.data("args", args);
    });

    if (menu.find("button").length > 0) {
        $(obj).qtip({
            content: {text: menu},
            style: {
                classes: app.qtip_theme,
                tip: false
            },
            show: {
                event: false,
                delay: 0,
                solo: true,
                ready: true,
                effect: false,
                modal: false
            },
            hide: 'click',
            position: position
        });
    } else {
        if (args.hide_empty_menu_button)
            $(obj).hide();
        else
            $(obj).css({"cursor": "default"});
    }
}

;; ///-----------------------------------\\\\


app.check_username = function() {
    var username = $(this).val();
    if (username.trim() === "") return
    api.check_username_deferred(username, {
        error: function(data) {
            $(".username_ok").hide();
            $(".username_bad").show();
        }
    })
    .then(function(data) {
        $(".username_bad").hide();
        $(".username_ok").show();
    });
}

app.click_display_signup_payment_form = function(obj, e, args) {
    $(".stage").fillup("buynow");
    // load stripe sdk before the user provides payment info in
    // app.click_process_signup_payment_form
    var script = $("<script src='https://js.stripe.com/v2/'>");
    $("body").append(script);
    $("html").addclass("signupbuybg");
    $(".stage form input[name=password]").empty();
    $(".stage form input[name=username]").empty();
    $(".stage form input[name=username]").change(app.check_username);
    $(".stage form input[name=username]").blur(app.check_username);
    $(".stage form input[name=username]").keyup(app.check_username);

    /* load GA for just this form */
    var analytics_id="UA-74643463-1";

    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
    ga('create', analytics_id, 'auto');
    ga('send', 'pageview');



}

app.display_payment_error = function(msg) {
    var form = $(".stage form");
    form.find('.error_msg')
        .text(msg)
        .show();
    // re-enable submit to give it a try again.
    form.find('button').prop('disabled', false);
}

app.click_process_signup_payment_form = function(obj, e, args) {

    var trim_val = function(obj) { obj.val(obj.val().trim()); }

    var form = $(".stage form");
    var formdata = formscrape(".stage form");
    form.find('.error_msg')
        .stop()
        .hide();

    // remove password from stripe data
    var password = formdata.password;
    var username = formdata.username;
    // console.log("username: " + username);
    // console.log("password: " + password);
    trim_val($(".stage form input[data-stripe=number]"));
    trim_val($(".stage form input[data-stripe=cvc]"));
    trim_val($(".stage form input[data-stripe=exp-month]"));
    trim_val($(".stage form input[data-stripe=exp-year]"));
    $(".stage form input[name=password]").empty();
    $(".stage form input[name=username]").empty();


    if (formdata.terms == false) {
        form.find('.tosbox')
            .css({'background': 'rgba(0, 255, 255, .25)'})
        setTimeout(function() {
            form.find('.tosbox').css({'background': 'transparent'})}, 5000);
        app.display_payment_error("Please accept the terms of service.");
        return;
    }


    form.find('button').prop('disabled', true);
    setTimeout(function() {
        // ALWAYS un-disable..
        form.find('button').prop('disabled', false);
    }, 3000);


    Stripe.setPublishableKey(stripe_pubkey);
    Stripe.card.createToken($(".stage form"), function(status, response) {

        if (response.error) {

            // Show the errors on the form
            app.display_payment_error(response.error.message);

        } else {

            formdata.token = response.id;
            _ajax.username = formdata.username = username;
            app.prepare_token(_ajax.username, password);
            formdata.password = _ajax.token;
            // console.dir(formdata);

            api.cloud_sign_up_deferred(formdata)
            .then(function(data) {

                // console.dir(data);
                $("html").removeClass("signupbuybg")

                app.prepare_token(_ajax.username, password);
                app.login();
                swal({
                    title: "Welcome to Userify!",
                    text: "Get started by creating a company and adding some servers.",
                    type: "success",
                    showCancelButton: false,
                    closeOnConfirm: true,
                    animation: "slide-from-top"
                });

            });
        }
    });
}

;; ///-----------------------------------\\\\


// after initial page load, status is loaded to see what is next.
// this figures out what to do next.

app.status_login = function(server_status) {
    if (!server_status || !server_status.status) {
        alert("No server status?");
        setTimeout(function() {
            location.reload(true);
        }, 3000);
    }
    app.status_timeout = false;
    server_status = server_status;
    console.log(server_status.name
        + " " + server_status.edition
        + " " + server_status.version);
    app.update_status(server_status);
    if (server_status.status == "needs_base_config"
        || document.location.hash == "#action=server-configuration") {
            app.click_server_configuration();
    } else if (
        app.edition != "Cloud" && (
            document.location.hash == "#action=admin" ||
            document.location.hash == "#admin" ||
            document.location.hash == "admin"
            )) {
                app.click_display_main_config_login_form();
    } else if (server_status.status == "success") {
        if (_ajax.username && _ajax.token) {
            app.login();
        } else {
            if (document.location.hash == "#action=instantsignup") {
                app.click_display_signup_payment_form();
            } else if (document.location.hash == "#action=signup") {
                app.click_display_signup_form();
            } else {
                // already done.
                // app.click_display_login_form();
            }
        }
    } else {
        app.display_logofied_modal('<h3>Error loading ' + app.name + '. Please reload page.</h3><p>If you continue to experience issues, please try again later, or <a href="mailto:support@userify.com">notify support.</a></p>');
    }
}

;; ///-----------------------------------\\\\


;;

if (DEBUG)
  stripe_pubkey = "pk_test_5yflhnrVSnVGPLDaqMKnFmrL";
else
  stripe_pubkey = "pk_live_39z4TbSoF8sSMacYNY04BJsg";


;; ///-----------------------------------\\\\



app.click_toggle_lights = function(obj, e, args) {
  $(".dark-main-css").remove();
  $(".prism-dark-main-css").remove();
  // $("img.logo").attr("src", current_theme_settings.original_logo);
  if (current_theme_settings.current == 1) {
    // Toggle to DARK:
    current_theme_settings.current = 0;
    // $("img.logo").attr("src", current_theme_settings.toggled_logo);
    $("body").addClass("dark-theme");
    load_css(current_theme_settings.dark_fn, "dark-main-css");
    load_css(current_theme_settings.prism_dark_fn, "prism-dark-main-css");
    $("img.logo").attr("src", current_theme_settings.dark_navbar_logo);
    app.qtip_theme = "qtip-tipsy";

  } else {
    // Toggle to LIGHT:
    // $("img.logo").attr("src", current_theme_settings.toggled_logo);
    current_theme_settings.current = 1;
    $("body").removeClass("dark-theme");
    // $("img.logo").attr("src", current_theme_settings.light_navbar_logo);
    $("img.logo").attr("src", current_theme_settings.dark_navbar_logo);
    $(".panel.login_form img.logo").attr("src", current_theme_settings.login_logo);
    $(".panel.signup img.logo").attr("src", current_theme_settings.login_logo);
    app.qtip_theme = "qtip-bootstrap";
    load_css(current_theme_settings.prism_light_fn, "prism-light-main-css");
  }
  Cookies.set("theme-colors", current_theme_settings.current);
}

// 0 is DARK
// 1 is LIGHT

current_theme_settings.current = Cookies.get("theme-colors");
if (current_theme_settings.current === undefined) {
  current_theme_settings.current = 0;
  // default: light (flip now)
  app.click_toggle_lights();
} else if (current_theme_settings.current == 0) {
  current_theme_settings.current = 1;
  app.click_toggle_lights();
} else {
  current_theme_settings.current = 0;
  app.click_toggle_lights();
}


;; ///-----------------------------------\\\\


// prevent users from typing in non-whitelisted characters into a function.
// This function only allows: underscore and lowercase alphanumerics and
// doesn't allow numbers for the first character.
// It's designed expressly for usernames.
//
// Usage:
//   $(".stage input[name=username]")
//     .accept_only_lowercase_numbers_and_underscore();

$.fn.accept_only_lowercase_numbers_and_underscore = function() {

  var t = $(this);

  t.keypress(function(evt){

    // only allow lowercase for the first character:
    var l = t.val().length;
    var allow = false;

    // allow underscore
    if (l > 0 && evt.keyCode === 95) allow = true;

    // allow lowercase latin characters
    if (evt.keyCode >= 97 && evt.keyCode <= 122) allow = true;

    // allow arabic numerals
    if (l > 0 && evt.keyCode >= 48 && evt.keyCode <= 57) allow = true;

    if (!allow) {
      console.log("Ignoring key", evt.keyCode);
      return false;
    }

  })
}

;; ///-----------------------------------\\\\


if (0) {

    resize_function = function(f) {
        var still_running = false;
        var previous_height = 0;
        var previous_width = 0;
        if (!f) console.error("Please provide resize_function with a function");
        $(window).resize(function() {
            if (still_running) return;
            still_running = true;
            var height = $(window).height(); // New height
            var width = $(window).width(); // New width
            if (height != previous_height || width != previous_width) {
                setTimeout(function() {
                    f(previous_height, previous_width, height, width);
                    previous_height = height;
                    previous_width = width;
                    still_running = false;
                }, 125);
            }
        });
    }

    resize_function(function(ph, pw, h, w) {
        console.log ("Screen size has changed. New size: " + h + ", " + w);
    });


    if (0) {

        setTimeout(function() {
            $(".stage").fillup("company_list");
        }, 1000);

        app.click_here = function(obj, e, args) {
            console.log("here!");
            console.dir(args);
            console.log(e);
            console.log(obj);
        }
    }

}

;; ///-----------------------------------\\\\


// debug_function = app.click_display_signup_payment_form;

;; ///-----------------------------------\\\\


/*
 *
 * Userify Cloud Edition
 * Copyright (c) 2019 Userify Corp.
 *
 */


app.display_initial_login = function() {
    // app.click_display_login_form();
    // $(".navbar-brand").fillup("logo35ondark");
    // $(".navbar-brand").html('<img src="/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg">');
    app.click_display_login_form();
    // $(".login.panel img").attr("src", "https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg").css("height", "32px");
};

// Set Cloud Edition vars
app.set_edition = function() {

    $(".edition").html("CLOUD");
    $(".edition-titlebar").html("Cloud Edition");
    app.edition = "Cloud";
    app.name = "Userify";
    app.full_name = app.name + " " + app.edition + " " + app.version;
    app.edition_lower = app.edition.toLowerCase();
    $(".show_on_enterprise").hide();
}


// Set theme for Cloud
app.set_edition_theme = function() {

    //$(".navbar-brand").html('<img src="/userify-logo_2016-white-blue-no-tagline-no-cloud-curve.svg">');
    // $(".navbar-brand").html('<img src="https://userify.com/media/userify-logo_2016-white-purple-no-tagline.svg" height=32 style="margin: 2px 0 0 0">');

    app.userify_theme = app.edition_lower;
    $(".theme").removeClass("theme-dark");
    $(".theme").removeClass("theme-day");
    $(".theme").addClass("theme-default");
    $(".bootstrap_theme").attr("href", "");
    // $(".navbar-brand").fillup("logo35onwhite");
}

app.show_edition_features = function() {
    $(".display-cloud").show();
}

app.click_server_configuration = function(obj, e, args) {
    app.display_logofied_modal('<h3>Error 500.</h3><p>Something has gone wrong. Please let us know at <a href="mailto:support@userify.com">support@userify.com.</a> Thanks!!</p>');
}


app.click_test_settings = function(obj, e, args) {
}

app.click_display_main_config_login_form = function(obj, e, args) {
}

app.click_main_config_login = function(obj, e, args) {
}

app.click_continue_from_confirmation = function(obj, e, args) {
}

app.click_display_main_config = function(obj, e, args) {
}

app.click_update_main_config = function(obj, e, args) {
}

