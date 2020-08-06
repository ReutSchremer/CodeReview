from jenkinsci/jenkins:lts
#from bitnami/jenkins:2
USER root

RUN apt-get update 
RUN apt-get -y install apt-transport-https ca-certificates curl gnupg2 software-properties-common 
RUN curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg > /tmp/dkey; apt-key add /tmp/dkey 
RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(lsb_release -cs) stable" 
RUN apt-get update 
RUN apt-get -y install docker-ce
RUN usermod -aG docker jenkins

#RUN mkdir -p /app
#WORKDIR /app
#COPY ./ /app
#COPY docker-compose.yml /

#Installing docker-compose
RUN curl -L https://github.com/docker/compose/releases/download/1.21.2/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose
