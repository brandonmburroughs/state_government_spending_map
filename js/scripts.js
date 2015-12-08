/* 
Building the map
*/

// Define some config variables
var config = {"color1":"#d3e5ff", // Starting color
              "color2":"#000066", // Ending Color
              "stateDataColumn":"State", // The "state" column name
              "state":"State"}; // The state name column
  
// Width and heigh of map
var map_width = 800, map_height = 475;

// How many color in our maps gradient
var number_of_colors = 50; 

// Scale of map
var map_scale = 0.85;

// Function to build our color grandient steps
function Interpolate(start, end, steps, count) {
    var s = start,
        e = end,
        final = s + (((e - s) / steps) * count);
    return Math.floor(final);
}

// Is this needed?
function Color(_r, _g, _b) {
    var r, g, b;
    var setColors = function(_r, _g, _b) {
        r = _r;
        g = _g;
        b = _b;
    };

    setColors(_r, _g, _b);
    this.getColors = function() {
        var colors = {
            r: r,
            g: g,
            b: b
        };
        return colors;
    };

}

// Convert a hex color to rgb values
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Convert binary values to yes/no
function valueFormat(value) {
  return "$" + value.toFixed(2);
}

// Use the data to build the map
d3.csv("data/state_data_percent.csv", function(err, data) {

  // Get fields names to use later
  var fields = d3.keys(data[0]);
  
  // Build rgb values of colors
  var startColors = hexToRgb(config.color1),
      endColors = hexToRgb(config.color2)
  
  // Create colors array
  var colors = [];
  
  // Build color gradient if number if colors is greater than 2
  for (var i = 0; i < number_of_colors; i++) {
    var r = Interpolate(startColors.r, endColors.r, number_of_colors, i);
    var g = Interpolate(startColors.g, endColors.g, number_of_colors, i);
    var b = Interpolate(startColors.b, endColors.b, number_of_colors, i);
    colors.push(new Color(r, g, b));
  }
  
  // Build a range
  var quantize = d3.scale.quantize()
      .domain([0, 1.0])
      .range(d3.range(number_of_colors).map(function(i) { return i }));
  
  // Initialize geo path
  var path = d3.geo.path();
  
  // Create canvas
  var svg_map = d3.select("#map-svg").append("svg")
      .attr("width", map_width)
      .attr("height", map_height);
  
  // Draw the map
  // Load state names and abbreviations
  d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv", function(error, names) {
    // Load info to draw map of US
    d3.json("https://s3-us-west-2.amazonaws.com/vida-public/geo/us.json", function(error, us) {
      
      // Create mapping of name to abbreviation and vice versa
      var name_id_map = {};
      var id_name_map = {};
      
      for (var i = 0; i < names.length; i++) {
        name_id_map[names[i].name] = names[i].id;
        id_name_map[names[i].id] = names[i].name;
      }
      
      // Create dictionary structure of data values
      var dataMap = {};
      
      data.forEach(function(d) {
        if (!dataMap[d[config.state]]) {
          dataMap[d[config.state]] = {};
        }
        
        for (var i = 0; i < d3.keys(data[0]).length; i++) {
          if (d3.keys(data[0])[i] !== config.state) {
            dataMap[d[config.state]][d3.keys(data[0])[i]] =
              +d[d3.keys(data[0])[i]];
          }
        }
      });
      
      // Draw the map
      function drawMap(dataColumn) {
        var valueById = d3.map();
        
        data.forEach(function(d) {
          var id = name_id_map[d[config.state]];
          valueById.set(id, +d[dataColumn]); 
        });
        
        quantize.domain([d3.min(data, function(d){ return +d[dataColumn] }),
          d3.max(data, function(d){ return +d[dataColumn] })]);
      
        // Draw and color map
        svg_map.append("g")
                .attr("class", "states-choropleth")
              .selectAll("path")
                .data(topojson.feature(us, us.objects.states).features)
              .enter().append("path")
                .attr("transform", "scale(" + map_scale + ")")
                .style("fill", function(d) {
                  if (valueById.get(d.id)) {
                    var i = quantize(valueById.get(d.id));
                    var color = colors[i].getColors();
                    return "rgb(" + color.r + "," + color.g +
                        "," + color.b + ")";
                  } else {
                    return "";
                  }
                })
                .attr("d", path)
                .on("mousemove", function(d) {
                    // Build HTML for tooltip
                    var html = "";
          
                    html += "<div class=\"tooltip_kv\">";
                    html += "<span class=\"tooltip_title\">";
                    html += id_name_map[d.id];
                    html += "</span>";
                    html += "</div>";
                    
                    for (var i = 1; i < d3.keys(data[0]).length; i++) {
                      html += "<div class=\"tooltip_kv\">";
                      html += "<span class='tooltip_key'>";
                      html += d3.keys(data[0])[i];
                      html += "</span>";
                      html += "<span class=\"tooltip_value\">";
                      html += valueFormat(dataMap[id_name_map[d.id]][d3.keys(data[0])[i]]);
                      html += "";
                      html += "</span>";
                      html += "</div>";
                    }
                    
                    // Put HTML in tooltip
                    $("#tooltip-container").html(html);
                    $(this).attr("fill-opacity", "1.0");
                    $("#tooltip-container").show();
                    
                    var coordinates = d3.mouse(this);
                    
                    var map_width = $('.states-choropleth')[0].getBoundingClientRect().width;
                    
                    if (d3.event.layerX < map_width / 2) {
                      d3.select("#tooltip-container")
                        .style("top", (d3.event.layerY + 15) + "px")
                        .style("left", (d3.event.layerX + 15) + "px");
                    } else {
                      var tooltip_width = $("#tooltip-container").width();
                      d3.select("#tooltip-container")
                        .style("top", (d3.event.layerY + 15) + "px")
                        .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
                    }
                })
                .on("mouseout", function() {
                        $(this).attr("fill-opacity", "1.0");
                        $("#tooltip-container").hide();
                    });
      
        svg_map.append("path")
                .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
                .attr("class", "states")
                .attr("transform", "scale(" + map_scale + ")")
                .attr("d", path);
      }
      
      drawMap();

      /*
      Building the bar chart
      */

      // Display parameters
      var margin = {top: 40, right: 20, bottom: 80, left: 60},
          width = 1000 - margin.left - margin.right,
          height = 350 - margin.top - margin.bottom;

      // Build x and y ranges
      var x = d3.scale.ordinal()
          .rangeRoundBands([0, width], .1);

      var y = d3.scale.linear()
          .range([height, 0]);

      // Build axes
      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left")
          .ticks(10)
          .tickFormat(d3.format("$"));

      // Create container
      var svg_bar_chart = d3.select("#overall-bar-chart").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Tool tip
      var tip = d3.tip()
                  .attr('class', 'd3-tip')
                  .offset([-32, -8])
                  .html(function(d) {
                    return "<span class='bar-chart-tooltip'>" + valueFormat(d.Mean) + "</span>";
                  });
      
      // Tooltip
      svg_bar_chart.call(tip);

      // Data
      d3.csv("data/state_summary_data.csv", type, function(error, summary_data) {
        if (error) throw error;

        // Set domains
        x.domain(summary_data.map(function(d) { return d.Expenditure; }));
        y.domain([0, d3.max(summary_data, function(d) { return d.Mean; })]);

        // Build X-axis
        svg_bar_chart.append("g")
                      .attr("class", "x axis")
                      .attr("transform", "translate(0," + height + ")")
                      .call(xAxis)
                      .selectAll(".tick text")
                      .call(wrap, x.rangeBand());

        // Build Y-axis
        svg_bar_chart.append("g")
                      .attr("class", "y axis")
                      .call(yAxis)
                      .append("text")
                      .attr("transform", "rotate(-90)")
                      .attr("y", 6)
                      .attr("dy", ".71em")
                      .style("text-anchor", "end");

        // Add data bars
        svg_bar_chart.selectAll(".bar")
                      .data(summary_data)
                      .enter()
                      .append("rect")
                      .attr("class", "bar")
                      .attr("x", function(d) { return x(d.Expenditure); })
                      .attr("width", x.rangeBand())
                      .attr("y", function(d) { return y(d.Mean); })
                      .attr("height", function(d) { return height - y(d.Mean); })
                      .on("mouseover", function(d) {drawMap(d.Expenditure);})
                      .on('mouseover.tip', tip.show)
                      .on('mouseout', tip.hide);

        // X Axis Label
        svg_bar_chart.append("text")
                      .attr("class", "axis-label")
                      .style("text-anchor", "middle")
                      .attr("x", width / 2)
                      .attr("y", height + margin.bottom - 10)
                      .text("Expenditure Category");

        // Y Axis Label
        svg_bar_chart.append("text")
                      .attr("class", "axis-label")
                      .attr("transform", "rotate(-90)")
                      .style("text-anchor", "middle")
                      .attr("x", 0 - height / 2)
                      .attr("y", 0 - margin.left + 20)
                      .text("Average Expenditure per Capita");

        // Title
        svg_bar_chart.append("text")
                      .attr("x", (width / 2))             
                      .attr("y", 0 - (margin.top / 2))
                      .attr("text-anchor", "middle")  
                      .style("font-size", "20px")
                      .style("font-weight", "bold")
                      .text("Average State Expenditures per Capita");
      
      });

      // Function wraps text for bar chart
      function wrap(text, width) {
        text.each(function() {
          var text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              word,
              line = [],
              lineNumber = 0,
              lineHeight = 1.1, // ems
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy")),
              tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
          while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
          }
        });
      }

      // Convert data type to number
      function type(d) {
        d.Mean = +d.Mean;
        return d;
      } 
      
    });
  });
});

// Gradient Bar variables
var gradient_bar_width = map_width - 200,
    gradient_bar_height = map_height / 20;

// Create SVG for gradeint
var svg_gradient = d3.select("#gradient-bar").append("svg")
    .attr("width", gradient_bar_width)
    .attr("height", gradient_bar_height + 50);

// Create basic gradient
var gradient = svg_gradient.append("defs")
  .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%")
    .attr("spreadMethod", "pad");

// Add gradient beginning color
gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#d3e5ff")
    .attr("stop-opacity", 1);

// Add gradient ending color
gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#000066")
    .attr("stop-opacity", 1);

// Add gradient bar
svg_gradient.append("rect")
            .attr("width", gradient_bar_width)
            .attr("height", gradient_bar_height)
            .style("fill", "url(#gradient)");

// Add labels
svg_gradient.append("text")
            .text("Less Spending")
            .attr("x", 0)
            .attr("y", gradient_bar_height + 20);

svg_gradient.append("text")
            .text("More Spending")
            .attr("x", gradient_bar_width - 110)
            .attr("y", gradient_bar_height + 20);

