const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { WEATHER_API_KEY } = process.env; // Cargar la clave desde .env

// Helper para convertir Kelvin a Celsius y Fahrenheit
const kelvinToCelsius = (k) => (k - 273.15).toFixed(1);
const kelvinToFahrenheit = (k) => ((k - 273.15) * 9 / 5 + 32).toFixed(1);
const metersPerSecondToKmh = (mps) => (mps * 3.6).toFixed(1);

// Mapeo de iconos de OpenWeatherMap a emojis (simplificado)
const weatherIcons = {
    '01d': '☀️', '01n': '🌙', // clear sky
    '02d': '⛅', '02n': '☁️', // few clouds
    '03d': '☁️', '03n': '☁️', // scattered clouds
    '04d': '☁️', '04n': '☁️', // broken clouds
    '09d': '🌧️', '09n': '🌧️', // shower rain
    '10d': '🌦️', '10n': '🌧️', // rain
    '11d': '⛈️', '11n': '⛈️', // thunderstorm
    '13d': '❄️', '13n': '❄️', // snow
    '50d': '🌫️', '50n': '🌫️', // mist
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Muestra el clima actual de una ciudad.')
        .addStringOption(option =>
            option.setName('ciudad')
                .setDescription('El nombre de la ciudad (y opcionalmente código de país, ej: Monterrey,MX).')
                .setRequired(true)),
    async execute(interaction) {
        if (!WEATHER_API_KEY) {
            return interaction.reply({ embeds: [createErrorEmbed('El comando de clima no está configurado. Falta la API Key de OpenWeatherMap en `.env`.')], ephemeral: true });
        }

        const location = interaction.options.getString('ciudad');
        await interaction.deferReply();

        const units = 'metric'; // Usar métrico (Celsius) por defecto
        const lang = 'es'; // Obtener resultados en español
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_API_KEY}&units=metric&lang=${lang}`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.main || !data.weather || !data.sys) {
                 console.error("[Weather] Respuesta inesperada de API:", data);
                 throw new Error('La API devolvió datos incompletos.');
            }

            const cityName = data.name;
            const country = data.sys.country;
            const description = data.weather[0]?.description || 'N/A';
            const iconCode = data.weather[0]?.icon || '01d'; // Icono por defecto
            const weatherEmoji = weatherIcons[iconCode] || '❓';

            const tempK = data.main.temp;
            const feelsLikeK = data.main.feels_like;
            const tempMinK = data.main.temp_min;
            const tempMaxK = data.main.temp_max;
            const pressure = data.main.pressure; // hPa
            const humidity = data.main.humidity; // %
            const windSpeed = data.wind.speed; // m/s
            const windDeg = data.wind.deg; // degrees
            const clouds = data.clouds.all; // %

            const sunriseTs = data.sys.sunrise * 1000; // Convertir a ms
            const sunsetTs = data.sys.sunset * 1000;   // Convertir a ms

            const embed = createEmbed(`Clima en ${cityName}, ${country} ${weatherEmoji}`, `Actualmente: **${description}**`)
                .setColor(colors.default) // Podrías cambiar el color según la temperatura
                .setThumbnail(`https://openweathermap.org/img/wn/${iconCode}@2x.png`) // Icono oficial
                .addFields(
                    { name: '🌡️ Temperatura', value: `${kelvinToCelsius(tempK)}°C / ${kelvinToFahrenheit(tempK)}°F`, inline: true },
                    { name: '🥶 Sensación Térmica', value: `${kelvinToCelsius(feelsLikeK)}°C / ${kelvinToFahrenheit(feelsLikeK)}°F`, inline: true },
                    { name: '📊 Presión', value: `${pressure} hPa`, inline: true },

                    { name: '💧 Humedad', value: `${humidity}%`, inline: true },
                    { name: '💨 Viento', value: `${metersPerSecondToKmh(windSpeed)} km/h (${windDeg}°)`, inline: true },
                    { name: '☁️ Nubosidad', value: `${clouds}%`, inline: true },

                     { name: '☀️ Amanecer', value: `<t:${Math.floor(sunriseTs / 1000)}:T>`, inline: true }, // Hora local del usuario
                     { name: '🌙 Atardecer', value: `<t:${Math.floor(sunsetTs / 1000)}:T>`, inline: true }, // Hora local del usuario
                     { name: ' Rango Hoy', value: `Min: ${kelvinToCelsius(tempMinK)}°C, Max: ${kelvinToCelsius(tempMaxK)}°C`, inline: true },
                )
                 .setFooter({ text: `Datos de OpenWeatherMap | Lat: ${data.coord.lat}, Lon: ${data.coord.lon}` });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Weather] Error fetching data for ${location}:`, error);
             if (error.message.includes('404')) { // OWM devuelve 404 si no encuentra la ciudad
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo encontrar la ciudad "${location}". Intenta incluir el código del país (ej: Monterrey, MX).`)] });
            } else if (error.message.includes('401')) { // Error de API Key
                 await interaction.editReply({ embeds: [createErrorEmbed('La API Key de OpenWeatherMap no es válida o ha expirado.')] });
            }
             else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el clima: ${error.message}`)] });
            }
        }
    },
};
