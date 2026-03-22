"""PyPI package configuration for RestEasy CLI agent harness."""

from setuptools import setup, find_namespace_packages

setup(
      name="cli-anything-resteasy",
      version="1.0.0",
      description="RestEasy TCC-I CLI — agent harness for the RestEasy sleep app",
      long_description=open("cli_anything/resteasy/README.md").read(),
      long_description_content_type="text/markdown",
      author="siamubee2-max",
      python_requires=">=3.9",
      packages=find_namespace_packages(include=["cli_anything.*"]),
      install_requires=[
                "click>=8.1",
                "rich>=13.0",
                "supabase>=2.0",
                "python-dotenv>=1.0",
      ],
      extras_require={
                "dev": [
                              "pytest>=8.0",
                              "pytest-cov>=5.0",
                ]
      },
      entry_points={
                "console_scripts": [
                              "resteasy=cli_anything.resteasy.main:main",
                ]
      },
      classifiers=[
                "Programming Language :: Python :: 3",
                "License :: Other/Proprietary License",
                "Operating System :: OS Independent",
      ],
)
