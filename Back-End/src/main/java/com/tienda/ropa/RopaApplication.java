package com.tienda.ropa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

import com.tienda.ropa.config.VentaDirectaConfig;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(VentaDirectaConfig.class)
public class RopaApplication {

	public static void main(String[] args) {
		SpringApplication.run(RopaApplication.class, args);
	}

	@Bean
	public RestTemplate restTemplate() {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(600000); // 10 minutos en ms
		factory.setReadTimeout(600000);    // 10 minutos en ms
		return new RestTemplate(factory);
	}
}
