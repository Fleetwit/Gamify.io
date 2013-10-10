
$.plot($("#placeholder"), %data%, {
	grid: { show: true, borderWidth: 0.2 },
	xaxis: { show: true, ticks: 0 },
	yaxis: { show: true, ticks: 8, color: '#bbb'},
	colors: ["#aad5f5", "#008fde"],
	series: {
		stack: 0,
		fill: 1,
		bars: { show: true, barWidth: 0.9, lineWidth: 0, fill: 1 }
	}
});

$(".overall-views-graph select").select2();