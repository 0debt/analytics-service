/**
 * Generates a QuickChart.io URL for a pie chart.
 * @param data - Category to amount mapping
 * @returns Chart URL string
 */
export function generateChartUrl(data: Record<string, number>): string {
    const labels = Object.keys(data);
    const values = Object.values(data);

    const chartConfig = {
        type: 'pie',
        data: {
            labels,
            datasets: [{ data: values }]
        }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

