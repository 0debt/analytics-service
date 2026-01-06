/**
 * Generates a QuickChart.io URL for a pie chart.
 * @param data - Category to amount mapping
 * @returns Chart URL string
 */
export function generateChartUrl(data: Record<string, number>): string {
    // 1. Filtrar valores menores a 0.01 (limpia basura decimal y ceros)
    const cleanData = Object.entries(data)
        .filter(([_, value]) => value > 0.01)
        .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

    const labels = Object.keys(cleanData);
    const values = Object.values(cleanData);

    const chartConfig = {
        type: 'pie',
        data: {
            labels,
            datasets: [{ data: values }]
        }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

