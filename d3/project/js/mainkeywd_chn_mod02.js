var width = 700,
    height = 400,
    p = [20, 50, 30, 20],
	z = d3.scale.ordinal()
		.range(["#084594", "#2171b5", "#4292c6","#6baed6","#9ecae1","#c6dbef"]),
    parseDate = d3.time.format("%Y%m%d").parse,
    returnDate = d3.time.format("%m/%d"),
	channel_list = ["news", "blog", "community", "voc", "twitter", "reply"],
	start_point = [p[1], height - 80];

var x = d3.scale.ordinal()
			.rangeRoundBands([p[1], width - p[1] - p[3]]),
	y = d3.scale.linear().range([start_point[1] - p[0], 0]);
	
var stack = d3.layout.stack()
				.values(function(d){return d.y});

var svg = d3.select("div").append("svg")
    .attr("width", width)
    .attr("height", height);
	
var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.outerTickSize(0)
				.tickPadding(5);
					
var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left")
				.innerTickSize((-width + 2 * p[1]))
				.ticks(5)
				.outerTickSize(0)
				.tickPadding(10);
				
var test_k = [], test_orign = [];
	
d3.json("data/mainkeywd_chn_month.json", function(keyword) {
test_orign = keyword;
  // Transpose the data into layers by channel.
	var keywords = d3.nest()
				.key(function(d){return d.channel;})
				.entries(keyword)

	var channels = d3.layout.stack()(keywords.map(function(d){
			return d.values.map(function(e){
				return {x:parseDate(e.date),y:e.count, chnl:e.channel}
				})
			})
		);
test_k = channels;
	if (channels[0].length > 20){
		xAxis.tickFormat(function(d, i){
					return i % 5 !== 0 ? null : d;
					});
	}else {
		xAxis.ticks(5)
	}

	x.domain(channels[0].map(function(d) { return returnDate(d.x); }))
	y.domain([0, d3.max(channels[channels.length - 1], function(d) { 
					return d.y0 + d.y; 
				})
			]);
  
	var channel = svg.append("g")
					 .attr("class", "bar");
	svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + start_point[1] + ")")
		  .call(xAxis);
		  
	svg.append("g")
		  .attr("class", "y axis")
		  .attr("transform", 
			"translate(" + start_point[0] +"," + (start_point[1]-y(0))+")"
		  )
		  .call(yAxis);
		  
	var tooltip = d3.select("div").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);	 
		
  // Add a rect for each date.
	var rect = channel.selectAll("g")
      .data(d3.merge(channels))
    .enter().append("rect")
      .attr("x", function(d) { return x(returnDate(d.x)); })
 //     .attr("y", function(d) { return y(d.y0) - y(d.y); })
 //     .attr("height", function(d) { return y(d.y); })
	    .attr("y", function(d) { return y(d.y + d.y0); })
		.attr("height", function(d) { return y(d.y0) - y(d.y+d.y0); })
		.attr("width", x.rangeBand()-2)
	    .attr("class", function(d){ return "bar_" + d.chnl; })
	    .attr("transform", 
			"translate(0," + (start_point[1]-y(0))+")"
		  )
	 .style("fill", function(d){ return z(d.chnl);})
		.on("mouseover", function(d){
			tooltip.transition()
					.duration(200)
					.style("opacity", 0.9);
			tooltip.html(returnDate(d.x)+"<br/>"+d.chnl+"<br/>"+ d.y)
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 28) + "px");			
		})
		.on("mouseout", function(d){
			tooltip.transition()
					.duration(500)
					.style("opacity", 0);
		});
	  ;
  
	var legend = svg.append("g")
	  .attr("class", "legend")
	  .attr("x", width/3)
	  .attr("y", height - p[0] - p[2])
	  .attr("height", 100)
	  .attr("width", 100);    
	
	legend.selectAll('g').data(channel_list)
      .enter()
      .append('g')
      .each(function(d, i) {
		var g = d3.select(this);
			g.append("rect")
			  .attr("x", p[1] + i*100)
			  .attr("y", height - p[0] - p[2] + 10)
			  .attr("width", 10)
			  .attr("height", 10)
			  .style("fill", function(i){return z(i)})
			  .on("click", function(d,i){
				if (d3.selectAll(".bar_" + d).style("display") == "inline"){
				  d3.selectAll(".bar_" + d).style('display','none');
				  g.select("rect").style("opacity",0.3);
				} else {
				   d3.selectAll(".bar_" + d).style('display','inline');
				   g.select("rect").style("opacity",1);
				}
			  });
        
        g.append("text")
          .attr("x", p[1] + i*100 + 15)
          .attr("y", height - p[0] - p[2] + 19)
          .attr("height",30)
          .attr("width",100)
          .style("fill", "black")
		  .style("font-size", "12px")
          .text(function(){return d})
          ;
	});
});
